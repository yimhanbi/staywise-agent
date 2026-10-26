import { SearchParamsSchema } from "@staywise/shared-types";
import type { Hotel, SearchParamsInput } from "@staywise/shared-types";
import { buildApiUrl } from "./api_client";

interface HotelListResponse {
  hotels: Hotel[];
  total: number;
  count: number;
}

export interface AiChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface AiChatResponse {
  reply: string;
  hotels: Hotel[];
  total: number;
  conversation_id?: string;
  search?: { location?: string; category?: string; guests?: number; check_in?: string; check_out?: string } | null;
}

export interface AiConversationSummary {
  id: string;
  title: string;
  updated_at: string;
}

export interface AiStoredMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  metadata?: {
    hotels?: Hotel[];
    total?: number;
    search?: AiChatResponse["search"];
  };
  created_at: string;
}

export type AiChatStreamEvent =
  | { type: "progress"; message: string }
  | { type: "token"; text: string }
  | { type: "reset" };

function parseEventBlock(block: string): { event: string; data: unknown } | null {
  let event = "message";
  const dataLines: string[] = [];
  for (const line of block.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    if (line.startsWith("data:")) dataLines.push(line.slice(5).trimStart());
  }
  if (!dataLines.length) return null;
  return { event, data: JSON.parse(dataLines.join("\n")) as unknown };
}

export const hotelService = {
  async sendAiMessage(
    messages: AiChatTurn[],
    onEvent?: (event: AiChatStreamEvent) => void,
    conversationId?: string,
  ): Promise<AiChatResponse> {
    const url = buildApiUrl("/ai/chat");
    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages, conversation_id: conversationId }),
      });
    } catch (error) {
      throw new Error(`AI 대화 서버에 연결할 수 없습니다. [${url}]`, {
        cause: error as Error,
      });
    }
    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      let detail = errorText;
      try {
        detail = JSON.parse(errorText).detail ?? errorText;
      } catch {
        // Preserve a plain-text error response.
      }
      throw new Error(`AI 대화 요청 실패 (${response.status}): ${detail}`);
    }
    if (!response.headers.get("content-type")?.includes("text/event-stream")) {
      return (await response.json()) as AiChatResponse;
    }

    if (!response.body) throw new Error("AI 응답 스트림을 읽을 수 없습니다.");
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let result: AiChatResponse | undefined;
    let streamError = "";

    const consumeBlock = (block: string) => {
      const parsed = parseEventBlock(block);
      if (!parsed) return;
      if (parsed.event === "progress") {
        const progress = parsed.data as { message?: string };
        if (progress.message) onEvent?.({ type: "progress", message: progress.message });
      } else if (parsed.event === "token") {
        const token = parsed.data as { text?: string };
        if (token.text) onEvent?.({ type: "token", text: token.text });
      } else if (parsed.event === "reset") {
        onEvent?.({ type: "reset" });
      } else if (parsed.event === "result") {
        result = parsed.data as AiChatResponse;
      } else if (parsed.event === "error") {
        streamError = (parsed.data as { message?: string }).message ?? "AI 응답 생성에 실패했습니다.";
      }
    };

    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value, { stream: !done }).replace(/\r\n/g, "\n");
      let separator = buffer.indexOf("\n\n");
      while (separator >= 0) {
        consumeBlock(buffer.slice(0, separator));
        buffer = buffer.slice(separator + 2);
        separator = buffer.indexOf("\n\n");
      }
      if (done) break;
    }
    if (buffer.trim()) consumeBlock(buffer);
    if (streamError) throw new Error(streamError);
    if (!result) throw new Error("AI 응답 스트림이 결과 없이 종료됐습니다.");
    return result;
  },

  async listAiConversations(): Promise<AiConversationSummary[]> {
    const response = await fetch(buildApiUrl("/ai/conversations"));
    if (!response.ok) throw new Error("대화 기록 목록을 불러오지 못했습니다.");
    const body = (await response.json()) as { conversations: AiConversationSummary[] };
    return body.conversations;
  },

  async getAiConversation(id: string): Promise<{ id: string; title: string; messages: AiStoredMessage[] }> {
    const response = await fetch(buildApiUrl(`/ai/conversations/${encodeURIComponent(id)}`));
    if (!response.ok) {
      if (response.status === 404) throw new Error("저장된 대화를 찾을 수 없습니다.");
      throw new Error("대화 기록을 불러오지 못했습니다.");
    }
    return response.json();
  },

  async deleteAiConversation(id: string): Promise<void> {
    const response = await fetch(buildApiUrl(`/ai/conversations/${encodeURIComponent(id)}`), {
      method: "DELETE",
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.detail ?? "대화 기록을 삭제하지 못했습니다.");
    }
  },

  async fetchHotels(
    params: SearchParamsInput = {},
  ): Promise<HotelListResponse> {
    const normalizedParams = SearchParamsSchema.parse(params);
    if (
      normalizedParams.checkIn &&
      normalizedParams.checkOut &&
      normalizedParams.checkOut <= normalizedParams.checkIn
    ) {
      throw new Error("체크아웃 날짜는 체크인 날짜보다 뒤여야 합니다.");
    }
    const adults = normalizedParams.adults ?? 0;
    const children = normalizedParams.children ?? 0;
    const guests = adults + children;
    const pageCandidate = (params as SearchParamsInput & { page?: number }).page;
    const page =
      typeof pageCandidate === "number" && Number.isFinite(pageCandidate) && pageCandidate > 0
        ? Math.floor(pageCandidate)
        : 1;
    const url = buildApiUrl("/ai/search");

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: normalizedParams.location,
          category:
            normalizedParams.category && normalizedParams.category !== "전체"
              ? normalizedParams.category
              : undefined,
          check_in: normalizedParams.checkIn,
          check_out: normalizedParams.checkOut,
          guests: guests > 0 ? guests : undefined,
          page,
        }),
      });
    } catch (error) {
      throw new Error(`Failed to fetch hotels (network error) [${url}]`, {
        cause: error as Error,
      });
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(
        `Failed to fetch hotels (${response.status} ${response.statusText}) [${url}] ${errorText}`.trim(),
      );
    }

    return (await response.json()) as HotelListResponse;
  },

  async getHotelById(id: string): Promise<Hotel> {
    const url = buildApiUrl(`/mcp/hotels/${id}`);
    const response = await fetch(url);
    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(
        `Hotel not found (${response.status} ${response.statusText}) [${url}] ${errorText}`.trim(),
      );
    }
    return response.json();
  },
};
