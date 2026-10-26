"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { hotelService } from "@/services/hotelService";
import { buildApiUrl } from "@/services/api_client";
import type { Hotel } from "@staywise/shared-types";
import { useAuth } from "@/views/auth_context";
import { AuthModal } from "@/views/components/auth_modal";

declare global {
  interface Window {
    TossPayments?: (clientKey: string) => {
      payment: (options: { customerKey: string }) => {
        requestPayment: (options: Record<string, unknown>) => Promise<void>;
      };
    };
  }
}

type BookingDraft = {
  order_id: string;
  hotel_name: string;
  amount: number;
  nights: number;
};

function createGuestCustomerKey() {
  // randomUUID is unavailable in some browsers and non-secure local network origins.
  const randomPart = Math.random().toString(36).slice(2, 14);
  return `staywise_${Date.now()}_${randomPart}`;
}

export default function CheckoutPage() {
  const [hotelId, setHotelId] = useState("");
  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(1);
  const [conversationId, setConversationId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showAuth, setShowAuth] = useState(false);
  const { user, isAuthLoading } = useAuth();

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 0;
    const [inYear, inMonth, inDay] = checkIn.split("-").map(Number);
    const [outYear, outMonth, outDay] = checkOut.split("-").map(Number);
    return Math.floor((Date.UTC(outYear, outMonth - 1, outDay) - Date.UTC(inYear, inMonth - 1, inDay)) / 86_400_000);
  }, [checkIn, checkOut]);
  const earliestCheckout = useMemo(() => {
    const [year, month, day] = (checkIn || today).split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
  }, [checkIn, today]);
  const nightlyPrice = hotel?.price_per_night ?? hotel?.price ?? 0;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setHotelId(params.get("hotelId") ?? "");
    setCheckIn(params.get("checkIn") ?? "");
    setCheckOut(params.get("checkOut") ?? "");
    setConversationId(params.get("conversationId") ?? "");
    const guestsFromSearch = Number(params.get("guests"));
    if (Number.isSafeInteger(guestsFromSearch) && guestsFromSearch > 0) setGuests(guestsFromSearch);
  }, []);

  useEffect(() => {
    if (!hotelId) return;
    hotelService.getHotelById(hotelId).then(setHotel).catch((e: Error) => setError(e.message));
  }, [hotelId]);

  async function startPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY?.trim();
    if (!clientKey) {
      setError("프론트엔드 환경변수 NEXT_PUBLIC_TOSS_CLIENT_KEY를 설정하고 Next.js를 재시작해 주세요.");
      return;
    }
    if (!window.TossPayments) {
      setError("토스페이먼츠 결제 SDK를 불러오는 중입니다. 잠시 후 다시 시도해 주세요.");
      return;
    }
    if (!hotel || !checkIn || !checkOut) {
      setError("숙소와 체크인·체크아웃 날짜를 확인해 주세요.");
      return;
    }
    if (nights < 1) {
      setError("체크아웃은 체크인 다음 날 이후로 선택해 주세요.");
      return;
    }
    if (guests > (hotel.max_guests ?? 20)) {
      setError(`이 숙소의 최대 인원은 ${hotel.max_guests ?? 20}명입니다.`);
      return;
    }

    setLoading(true);
    try {
      const bookingResponse = await fetch(buildApiUrl("/bookings"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hotel_id: Number(hotel.id), check_in: checkIn, check_out: checkOut, guests, conversation_id: conversationId || null }),
      });
      const bookingBody = await bookingResponse.json();
      if (!bookingResponse.ok) throw new Error(bookingBody.detail ?? "예약 정보를 만들지 못했습니다.");
      const booking = bookingBody as BookingDraft;

      const tossPayments = window.TossPayments(clientKey);
      const payment = tossPayments.payment({ customerKey: createGuestCustomerKey() });
      await payment.requestPayment({
        method: "CARD",
        amount: { currency: "KRW", value: booking.amount },
        orderId: booking.order_id,
        orderName: `${booking.hotel_name} ${booking.nights}박 예약`,
        successUrl: `${window.location.origin}/payment/success`,
        failUrl: `${window.location.origin}/payment/fail`,
        customerName: "Staywise 게스트",
        card: { flowMode: "DEFAULT", language: "KO" },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "결제 요청을 시작하지 못했습니다.");
      setLoading(false);
    }
  }

  if (!hotel && !error) return <main className="mx-auto max-w-xl p-8 text-gray-600">숙소 정보를 불러오는 중입니다…</main>;

  return (
    <main className="mx-auto max-w-xl px-5 py-10">
      <a href="/" className="text-sm text-teal-700">← 숙소 목록</a>
      <h1 className="mt-5 text-2xl font-bold">예약 및 결제</h1>
      {hotel && (
        <form onSubmit={startPayment} className="mt-6 space-y-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold">{hotel.name}</h2>
            <p className="mt-1 text-sm text-gray-500">{hotel.address}</p>
            <p className="mt-3 text-sm text-gray-600">1박 예시 요금 ₩{(hotel.price_per_night ?? hotel.price ?? 0).toLocaleString()}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm">
            {isAuthLoading ? (
              <p className="text-gray-600">로그인 정보를 확인하고 있습니다.</p>
            ) : user ? (
              <p className="text-gray-700"><span className="font-semibold">{user.name}</span>님 계정의 예약 내역에 저장됩니다.</p>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-gray-600">로그인하면 예약 내역을 계정에서 확인할 수 있어요.</p>
                <button type="button" onClick={() => setShowAuth(true)} className="shrink-0 font-semibold text-[#0F766E] hover:underline">로그인 / 회원가입</button>
              </div>
            )}
          </div>
          <label className="block text-sm font-medium">체크인
            <input required type="date" min={today} value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2" />
          </label>
          <label className="block text-sm font-medium">체크아웃
            <input required type="date" min={earliestCheckout} value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2" />
          </label>
          <label className="block text-sm font-medium">게스트
            <input required type="number" min={1} max={hotel.max_guests ?? 20} value={guests} onChange={(e) => setGuests(Number(e.target.value))} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2" />
          </label>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm">
            <p className="font-semibold text-gray-900">예약 내용 확인</p>
            <div className="mt-2 space-y-1 text-gray-600">
              <p>체크인 · {checkIn || "날짜 선택 필요"}</p>
              <p>체크아웃 · {checkOut || "날짜 선택 필요"}</p>
              <p>게스트 · {guests}명 · {nights > 0 ? `${nights}박` : "숙박 일수 확인 필요"}</p>
              <p>1박 예시 요금 · ₩{nightlyPrice.toLocaleString()}</p>
            </div>
            {nights > 0 && <p className="mt-3 border-t border-gray-200 pt-3 text-base font-bold text-gray-900">예시 결제 금액 · ₩{(nightlyPrice * nights).toLocaleString()}</p>}
          </div>
          <p className="rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-800">포트폴리오 데모입니다. 표시 금액은 예시이며 실제 판매가가 아닙니다. 객실 재고와 운영자의 예약 확정은 연동되어 있지 않습니다. 결제 테스트 키로 테스트해 주세요.</p>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <button disabled={loading} className="w-full rounded-xl bg-teal-700 px-4 py-3 font-semibold text-white hover:bg-teal-800 disabled:opacity-60">
            {loading ? "결제창 준비 중…" : "테스트 결제 진행"}
          </button>
        </form>
      )}
      {!hotel && error && <p role="alert" className="mt-5 text-sm text-red-600">{error}</p>}
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </main>
  );
}
