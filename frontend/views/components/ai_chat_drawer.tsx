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
  onStartBooking: (hotel: Hotel, search?: ChatMessage["search"], conversationId?: string) => void;
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
  const [compareHotels, setCompareHotels] = useState<Hotel[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [bookingDraft, setBookingDraft] = useState<{ hotel: Hotel; search?: ChatMessage["search"] } | null>(null);
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
      setCompareHotels([]);
      setCompareOpen(false);
      setBookingDraft(null);
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
    setCompareHotels([]);
    setCompareOpen(false);
    setBookingDraft(null);
    setInput("");
    setHistoryOpen(false);
    nextId.current = 1;
    void startGreeting(id);
  };

  const toggleCompareHotel = (hotel: Hotel) => {
    const alreadySelected = compareHotels.some((item) => String(item.id) === String(hotel.id));
    if (alreadySelected) {
      setCompareHotels((current) => current.filter((item) => String(item.id) !== String(hotel.id)));
      setCompareOpen(false);
      return;
    }
    if (compareHotels.length >= 3) {
      setError("숙소 비교는 한 번에 최대 3곳까지 가능합니다.");
      return;
    }
    setError("");
    setCompareHotels((current) => [...current, hotel]);
  };

  const deleteConversation = async (id: string) => {
    try {
      await hotelService.deleteAiConversation(id);
      setConversations((current) => current.filter((item) => item.id !== id));
      if (id === conversationId) {
        window.localStorage.removeItem(CURRENT_CONVERSATION_KEY);
        startNewConversation();
      }
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "대화 기록을 삭제하지 못했습니다.");
    }
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
        aria-labelledby="staywise-ai-chat-title"
        className="absolute right-0 top-0 flex h-full w-full min-w-0 max-w-[100vw] flex-col overflow-hidden bg-white shadow-2xl sm:w-[440px]"
      >
        <header className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-700 text-lg text-white">✦</div>
            <div>
              <h2 id="staywise-ai-chat-title" className="font-bold text-gray-900">Staywise AI</h2>
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

        {bookingDraft && (
          <section className="shrink-0 border-b border-teal-100 bg-teal-50 px-4 py-3" aria-label="예약 전 확인">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-teal-800">예약 정보 확인</p>
                <p className="mt-1 truncate text-sm font-bold text-gray-900">{bookingDraft.hotel.name}</p>
                <p className="mt-1 text-xs text-gray-600">
                  {bookingDraft.search?.checkIn && bookingDraft.search?.checkOut
                    ? `${bookingDraft.search.checkIn} – ${bookingDraft.search.checkOut}`
                    : "체크인·체크아웃 날짜는 다음 단계에서 입력할 수 있어요."}
                  {bookingDraft.search?.guests ? ` · 게스트 ${bookingDraft.search.guests}명` : ""}
                </p>
              </div>
              <button type="button" onClick={() => setBookingDraft(null)} className="shrink-0 text-xs text-gray-500">닫기</button>
            </div>
            <p className="mt-2 rounded-lg bg-white/80 p-2 text-[11px] leading-4 text-gray-600">
              포트폴리오 데모입니다. 실제 객실 재고 및 숙소 운영자 예약 확정은 연동되어 있지 않습니다. 결제는 테스트 키를 사용해 진행해 주세요.
            </p>
            <div className="mt-2 flex gap-2">
              <button type="button" onClick={() => onStartBooking(bookingDraft.hotel, bookingDraft.search, conversationId)} className="flex-1 rounded-lg bg-teal-700 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-800">예약 정보 입력하기</button>
              <button type="button" onClick={() => setBookingDraft(null)} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600">취소</button>
            </div>
          </section>
        )}

        {historyOpen && (
          <div className="max-h-56 shrink-0 overflow-y-auto border-b border-gray-100 bg-white px-4 py-2">
            {conversations.length === 0 ? (
              <p className="py-3 text-center text-xs text-gray-500">저장된 대화가 없습니다.</p>
            ) : conversations.map((conversation) => (
              <div key={conversation.id} className={`flex items-center gap-1 rounded-lg ${conversation.id === conversationId ? "bg-teal-50" : "hover:bg-gray-50"}`}>
                <button
                  type="button"
                  onClick={() => void selectConversation(conversation.id)}
                  className={`min-w-0 flex-1 truncate px-3 py-2 text-left text-sm ${conversation.id === conversationId ? "font-semibold text-teal-800" : "text-gray-700"}`}
                >
                  {conversation.title}
                </button>
                <button type="button" onClick={() => void deleteConversation(conversation.id)} className="shrink-0 rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50" aria-label={`${conversation.title} 대화 삭제`}>삭제</button>
              </div>
            ))}
            <p className="px-3 pb-1 text-[11px] text-gray-400">대화 기록은 직접 삭제하기 전까지 보관됩니다.</p>
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
                    {message.hotels.map((hotel) => {
                      const selected = compareHotels.some((item) => String(item.id) === String(hotel.id));
                      return (
                        <article key={hotel.id} className="overflow-hidden rounded-xl border border-gray-100 bg-white p-2 shadow-sm">
                          <button
                            type="button"
                            onClick={() => onSelectHotel(hotel)}
                            aria-label={`${hotel.name} 상세 모달 열기`}
                            className="flex w-full min-w-0 items-center gap-3 text-left"
                          >
                            <img src={getHotelImage(hotel.id)} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold text-gray-900">{hotel.name}</span>
                              <span className="mt-1 block truncate text-xs text-gray-500">{hotel.address}</span>
                              <span className="mt-1 block truncate text-xs text-gray-600">평점·객실 정보 없음 · 예시 요금 ₩{(hotel.price_per_night ?? hotel.price ?? 0).toLocaleString()}/박</span>
                            </span>
                            <span className="shrink-0 text-xs font-medium text-teal-700">상세 ›</span>
                          </button>
                          <div className="mt-2 grid grid-cols-2 gap-2 border-t border-gray-100 pt-2">
                            <button
                              type="button"
                              aria-pressed={selected}
                              onClick={() => toggleCompareHotel(hotel)}
                              className={`rounded-lg border px-2 py-2 text-xs font-medium ${selected ? "border-teal-600 bg-teal-50 text-teal-800" : "border-gray-200 bg-white text-gray-700 hover:border-teal-300"}`}
                            >
                              {selected ? "✓ 비교 선택됨" : "비교할 숙소로 선택"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setBookingDraft({ hotel, search: message.search })}
                              className="rounded-lg bg-teal-700 px-2 py-2 text-xs font-semibold text-white hover:bg-teal-800"
                            >
                              예약 정보 확인
                            </button>
                          </div>
                        </article>
                      );
                    })}
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

        {compareHotels.length > 0 && (
          <section className="shrink-0 border-t border-teal-100 bg-white px-4 py-3" aria-label="비교할 숙소 목록">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-gray-800">비교할 숙소 ({compareHotels.length}/3)</p>
                <p className="mt-1 truncate text-[11px] text-gray-500">{compareHotels.map((hotel) => hotel.name).join(" · ")}</p>
              </div>
              <button
                type="button"
                disabled={compareHotels.length < 2}
                onClick={() => setCompareOpen(true)}
                className="shrink-0 rounded-lg bg-teal-700 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                {compareHotels.length < 2 ? "2곳 이상 선택" : `${compareHotels.length}곳 비교하기`}
              </button>
              <button type="button" onClick={() => setCompareHotels([])} className="shrink-0 px-1 text-xs text-gray-500 hover:text-gray-800">비우기</button>
            </div>
          </section>
        )}

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

        {compareOpen && (
          <div className="absolute inset-0 z-30 flex flex-col bg-white" role="dialog" aria-modal="true" aria-labelledby="staywise-hotel-comparison-title">
            <header className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div>
                <h3 id="staywise-hotel-comparison-title" className="font-bold text-gray-900">숙소 비교</h3>
                <p className="mt-1 text-xs text-gray-500">선택한 {compareHotels.length}곳의 조건을 확인해 보세요.</p>
              </div>
              <button type="button" onClick={() => setCompareOpen(false)} className="rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100">닫기</button>
            </header>
            <div className="flex-1 space-y-3 overflow-y-auto bg-gray-50 p-4">
              {compareHotels.map((hotel) => (
                <article key={hotel.id} className="rounded-xl border border-gray-200 bg-white p-4">
                  <div className="flex items-start gap-3">
                    <img src={getHotelImage(hotel.id)} alt="" className="h-16 w-16 rounded-lg object-cover" />
                    <div className="min-w-0 flex-1">
                      <h4 className="font-semibold text-gray-900">{hotel.name}</h4>
                      <p className="mt-1 line-clamp-2 text-xs text-gray-500">{hotel.address}</p>
                    </div>
                    <button type="button" onClick={() => toggleCompareHotel(hotel)} className="shrink-0 text-xs text-gray-500 hover:text-red-600">빼기</button>
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-3 border-t border-gray-100 pt-3 text-xs">
                    <div><dt className="text-gray-500">숙소 유형</dt><dd className="mt-1 font-medium text-gray-900">{hotel.category || "정보 없음"}</dd></div>
                    <div><dt className="text-gray-500">평점</dt><dd className="mt-1 font-medium text-gray-900">{hotel.rating?.toFixed(1) ?? "정보 없음"}</dd></div>
                    <div><dt className="text-gray-500">최대 인원</dt><dd className="mt-1 font-medium text-gray-900">{hotel.max_guests ? `${hotel.max_guests}명` : "정보 없음"}</dd></div>
                    <div><dt className="text-gray-500">1박 예시 요금</dt><dd className="mt-1 font-semibold text-teal-800">₩{(hotel.price_per_night ?? hotel.price ?? 0).toLocaleString()}</dd></div>
                  </dl>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => onSelectHotel(hotel)} className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:border-teal-400">상세 보기</button>
                    <button type="button" onClick={() => { setCompareOpen(false); setBookingDraft({ hotel }); }} className="rounded-lg bg-teal-700 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-800">예약 정보 확인</button>
                  </div>
                </article>
              ))}
              {compareHotels.length < 2 && <p className="text-center text-xs text-gray-500">비교할 숙소를 2곳 이상 선택해 주세요.</p>}
            </div>
            <footer className="border-t border-gray-100 bg-white p-4">
              <button type="button" onClick={() => setCompareOpen(false)} className="w-full rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm font-semibold text-teal-800">검색 결과로 돌아가기</button>
            </footer>
          </div>
        )}
      </aside>
    </div>
  );
};
