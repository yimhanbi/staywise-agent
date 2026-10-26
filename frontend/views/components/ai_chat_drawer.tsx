"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Hotel } from "@staywise/shared-types";
import { hotelService } from "@/services/hotelService";
import type { AiChatStreamEvent, AiStoredMessage, AiConversationSummary } from "@/services/hotelService";
import { getHotelImage } from "@/lib/hotel-images";
import { getCategoryLabel } from "@/constants/categories";

type ChatMessage = {
  id: number;
  role: "assistant" | "user";
  text: string;
  hotels?: Hotel[];
  search?: { location?: string; category?: string; guests?: number; checkIn?: string; checkOut?: string };
};

const CURRENT_CONVERSATION_KEY = "staywise.ai.currentConversationId";

function createConversationId() {
  if (typeof window !== "undefined" && window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`.replace(/[xy]/g, (character) => {
    const value = Math.floor(Math.random() * 16);
    return (character === "x" ? value : (value & 0x3) | 0x8).toString(16);
  });
}

function toChatMessage(message: AiStoredMessage): ChatMessage {
  const storedSearch = message.metadata?.search;
  const category = storedSearch?.category;
  return {
    id: message.id,
    role: message.role,
    text: message.content,
    hotels: message.metadata?.hotels,
    search: storedSearch ? {
      location: storedSearch.location,
      category: category ? getCategoryLabel(category) : undefined,
      guests: storedSearch.guests,
      checkIn: storedSearch.check_in,
      checkOut: storedSearch.check_out,
    } : undefined,
  };
}

interface AiChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectHotel: (hotel: Hotel) => void;
  onStartBooking: (hotel: Hotel, search?: ChatMessage["search"]) => void;
  onApplySearch: (search: { location?: string; category?: string; guests?: number }) => void;
}

export const AiChatDrawer = ({ isOpen, onClose, onSelectHotel, onStartBooking, onApplySearch }: AiChatDrawerProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [progress, setProgress] = useState("");
  const [liveReply, setLiveReply] = useState("");
  const [error, setError] = useState("");
  const [conversationId, setConversationId] = useState("");
  const [conversations, setConversations] = useState<AiConversationSummary[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(1);
  const initialized = useRef(false);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isSearching, liveReply, progress]);

  const refreshConversationList = async () => {
    try {
      setConversations(await hotelService.listAiConversations());
    } catch {
      // Keep the current conversation usable if history listing is temporarily unavailable.
    }
  };

  const handleStreamEvent = (streamEvent: AiChatStreamEvent) => {
    if (streamEvent.type === "progress") {
      setProgress(streamEvent.message);
    } else if (streamEvent.type === "token") {
      setProgress("");
      setLiveReply((current) => current + streamEvent.text);
    } else {
      setLiveReply("");
    }
  };

  const startGreeting = async (id: string) => {
    setIsSearching(true);
    setError("");
    try {
      const result = await hotelService.sendAiMessage([], handleStreamEvent, id);
      if (!result.reply.trim()) throw new Error("Ollama 모델이 빈 응답을 반환했습니다.");
      setMessages([{ id: nextId.current++, role: "assistant", text: result.reply }]);
      void refreshConversationList();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "AI 응답을 가져오지 못했습니다.");
    } finally {
      setProgress("");
      setLiveReply("");
      setIsSearching(false);
    }
  };

  useEffect(() => {
    if (!isOpen || initialized.current) return;
    initialized.current = true;
    setIsSearching(true);
    const savedId = window.localStorage.getItem(CURRENT_CONVERSATION_KEY);
    const id = savedId || createConversationId();
    window.localStorage.setItem(CURRENT_CONVERSATION_KEY, id);
    setConversationId(id);

    void (async () => {
      await refreshConversationList();
      try {
        const conversation = await hotelService.getAiConversation(id);
        const restoredMessages = conversation.messages.map(toChatMessage);
        setMessages(restoredMessages);
        nextId.current = restoredMessages.reduce((max, message) => Math.max(max, message.id), 0) + 1;
        setIsSearching(false);
      } catch (loadError) {
        if (loadError instanceof Error && loadError.message !== "저장된 대화를 찾을 수 없습니다.") {
          setError(loadError.message);
          setIsSearching(false);
          return;
        }
        await startGreeting(id);
      }
    })();
  }, [isOpen]);

  const selectConversation = async (id: string) => {
    setIsSearching(true);
    setHistoryOpen(false);
    setError("");
    try {
      const conversation = await hotelService.getAiConversation(id);
      const restoredMessages = conversation.messages.map(toChatMessage);
      setConversationId(id);
      window.localStorage.setItem(CURRENT_CONVERSATION_KEY, id);
      setMessages(restoredMessages);
      nextId.current = restoredMessages.reduce((max, message) => Math.max(max, message.id), 0) + 1;
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "대화 기록을 불러오지 못했습니다.");
    } finally {
      setIsSearching(false);
    }
  };

  const startNewConversation = () => {
    const id = createConversationId();
    setConversationId(id);
    window.localStorage.setItem(CURRENT_CONVERSATION_KEY, id);
    setMessages([]);
    setInput("");
    setHistoryOpen(false);
    nextId.current = 1;
    void startGreeting(id);
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const submitMessage = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const text = input.trim();
    if (!text || isSearching) return;

    setMessages((current) => [...current, { id: nextId.current++, role: "user", text }]);
    setInput("");
    setError("");
    setIsSearching(true);

    try {
      const conversation = [
        ...messages.map(({ role, text: content }) => ({ role, content })),
        { role: "user" as const, content: text },
      ].slice(-16);
      const result = await hotelService.sendAiMessage(conversation, handleStreamEvent, conversationId);
      const search = result.search
        ? {
            ...result.search,
            category: result.search.category
              ? getCategoryLabel(result.search.category)
              : undefined,
          checkIn: result.search.check_in,
          checkOut: result.search.check_out,
          }
        : undefined;
      if (!result.reply.trim()) {
        throw new Error("Ollama 모델이 빈 응답을 반환했습니다.");
      }
      setLiveReply("");
      setMessages((current) => [
        ...current,
        {
          id: nextId.current++,
          role: "assistant",
          text: result.reply,
          hotels: result.hotels?.slice(0, 5),
          search,
        },
      ]);
      void refreshConversationList();
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : "숙소 검색에 실패했습니다.");
    } finally {
      setProgress("");
      setLiveReply("");
      setIsSearching(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[130]">
      <button className="absolute inset-0 bg-slate-950/35" onClick={onClose} aria-label="대화창 닫기" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Staywise AI 숙소 찾기"
        className="absolute right-0 top-0 flex h-full w-full min-w-0 max-w-[100vw] flex-col overflow-hidden bg-white shadow-2xl sm:w-[440px]"
      >
        <header className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-700 text-lg text-white">✦</div>
            <div>
              <h2 className="font-bold text-gray-900">Staywise AI</h2>
              <p className="text-xs text-gray-500">대화로 숙소 찾기</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                const opening = !historyOpen;
                setHistoryOpen(opening);
                if (opening) void refreshConversationList();
              }}
              className="rounded-lg px-2 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100"
              aria-expanded={historyOpen}
            >
              대화 기록
            </button>
            <button
              type="button"
              onClick={startNewConversation}
              className="rounded-lg px-2 py-2 text-xs font-medium text-teal-700 hover:bg-teal-50"
            >
              새 대화
            </button>
            <button type="button" onClick={onClose} className="rounded-full p-2 text-gray-500 hover:bg-gray-100" aria-label="닫기">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 6 12 12M18 6 6 18" /></svg>
            </button>
          </div>
        </header>

        {historyOpen && (
          <div className="max-h-56 shrink-0 overflow-y-auto border-b border-gray-100 bg-white px-4 py-2">
            {conversations.length === 0 ? (
              <p className="py-3 text-center text-xs text-gray-500">저장된 대화가 없습니다.</p>
            ) : conversations.map((conversation) => (
              <button
                key={conversation.id}
                type="button"
                onClick={() => void selectConversation(conversation.id)}
                className={`block w-full truncate rounded-lg px-3 py-2 text-left text-sm hover:bg-teal-50 ${conversation.id === conversationId ? "bg-teal-50 font-semibold text-teal-800" : "text-gray-700"}`}
              >
                {conversation.title}
              </button>
            ))}
          </div>
        )}

        <div ref={scrollRef} className="min-w-0 flex-1 space-y-5 overflow-x-hidden overflow-y-auto bg-gray-50/70 px-4 py-5">
          {messages.map((message) => (
            <div key={message.id} className={`flex min-w-0 items-end gap-2 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              {message.role === "assistant" && (
                <div className="mb-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-700 text-sm text-white" aria-hidden="true">✦</div>
              )}
              <div className={`min-w-0 max-w-[82%] ${message.role === "user" ? "rounded-2xl rounded-br-md bg-teal-700 px-4 py-3 text-white shadow-sm" : "rounded-2xl rounded-bl-md border border-gray-100 bg-white px-4 py-3 text-gray-900 shadow-sm"}`}>
                <p className="whitespace-pre-wrap break-words text-sm leading-6">{message.text}</p>
                {message.hotels && message.hotels.length > 0 && (
                  <div className="mt-3 w-full min-w-0 max-w-full space-y-2">
                    {message.hotels.map((hotel) => (
                      <button
                        key={hotel.id}
                        type="button"
                        onClick={() => onSelectHotel(hotel)}
                        aria-label={`${hotel.name} 상세 모달 열기`}
                        className="flex w-full min-w-0 items-center gap-3 overflow-hidden rounded-xl border border-gray-100 bg-white p-2 text-left shadow-sm transition hover:border-teal-300"
                      >
                        <img src={getHotelImage(hotel.id)} alt="" className="h-16 w-16 rounded-lg object-cover" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-gray-900">{hotel.name}</span>
                          <span className="mt-1 block truncate text-xs text-gray-500">{hotel.address}</span>
                        </span>
                        <span className="shrink-0 text-xs font-medium text-teal-700">상세 보기 ›</span>
                      </button>
                    ))}
                    {message.hotels.map((hotel) => (
                      <button
                        key={`book-${hotel.id}`}
                        type="button"
                        onClick={() => onStartBooking(hotel, message.search)}
                        className="w-full min-w-0 whitespace-normal break-words rounded-xl bg-teal-700 px-3 py-2.5 text-sm font-semibold text-white hover:bg-teal-800"
                      >
                        {hotel.name} 예약하기
                      </button>
                    ))}
                    {message.search && (
                      <button
                        type="button"
                        onClick={() => onApplySearch(message.search!)}
                        className="w-full min-w-0 whitespace-normal rounded-xl border border-teal-200 bg-teal-50 px-3 py-2.5 text-sm font-semibold text-teal-800 hover:bg-teal-100"
                      >
                        검색 결과에 적용
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          {isSearching && liveReply && (
            <div className="flex items-end gap-2 justify-start">
              <div className="mb-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-700 text-sm text-white" aria-hidden="true">✦</div>
              <div className="max-w-[82%] rounded-2xl rounded-bl-md border border-gray-100 bg-white px-4 py-3 text-gray-900 shadow-sm">
                <p className="whitespace-pre-wrap break-words text-sm leading-6">{liveReply}</p>
              </div>
            </div>
          )}
          {isSearching && !liveReply && progress && (
            <div className="flex items-end gap-2 justify-start">
              <div className="mb-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-700 text-sm text-white" aria-hidden="true">✦</div>
              <div className="rounded-2xl rounded-bl-md border border-gray-100 bg-white px-4 py-3 text-sm text-gray-500 shadow-sm">{progress}</div>
            </div>
          )}
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>

        <form onSubmit={(event) => void submitMessage(event)} className="border-t border-gray-100 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="flex items-end gap-2 rounded-2xl border border-gray-200 bg-white p-2 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-100">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void submitMessage();
                }
              }}
              placeholder="어디로 여행 가세요?"
              rows={1}
              className="max-h-28 min-h-10 flex-1 resize-y bg-transparent px-2 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400"
              aria-label="메시지 입력"
            />
            <button type="submit" disabled={!input.trim() || isSearching} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-700 text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-gray-300" aria-label="메시지 보내기">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="m5 12 14-7-4 14-3-6-7-1Z" /><path d="m12 13 7-8" /></svg>
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
};
