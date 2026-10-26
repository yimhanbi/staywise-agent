"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { buildApiUrl } from "@/services/api_client";
import { AuthModal } from "@/views/components/auth_modal";
import { useAuth } from "@/views/auth_context";

type BookingRecord = {
  order_id: string;
  hotel_id: number;
  hotel_name: string;
  hotel_address: string | null;
  check_in: string;
  check_out: string;
  guests: number;
  nights: number;
  amount: number;
  status: string;
  created_at: string;
};

const STATUS_LABELS: Record<string, { label: string; style: string }> = {
  PENDING_PAYMENT: { label: "결제 대기", style: "bg-amber-50 text-amber-800" },
  CONFIRMED: { label: "테스트 결제 완료 · 예약 접수", style: "bg-teal-50 text-teal-800" },
  PAYMENT_FAILED: { label: "결제 취소 또는 실패", style: "bg-gray-100 text-gray-600" },
};

function formatDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return `${year}년 ${month}월 ${day}일`;
}

export default function BookingsPage() {
  const { user, isAuthLoading } = useAuth();
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoading(true);
    setError("");
    fetch(buildApiUrl("/bookings/me"), { credentials: "same-origin" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.detail ?? "예약 내역을 불러오지 못했습니다.");
        if (active) setBookings(body.bookings ?? []);
      })
      .catch((reason: Error) => { if (active) setError(reason.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user]);

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-4 py-8 sm:px-8">
      <header className="mb-8 flex items-center justify-between border-b border-gray-100 pb-5">
        <Link href="/" className="text-2xl font-extrabold tracking-tight text-[#0F766E]">Staywise</Link>
        <Link href="/" className="rounded-full px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100">숙소 둘러보기</Link>
      </header>

      <h1 className="text-3xl font-bold text-gray-900">예약 내역</h1>
      <p className="mt-2 text-gray-500">로그인 상태에서 생성한 예약과 결제 진행 상황을 확인할 수 있어요.</p>

      {isAuthLoading ? (
        <p className="py-20 text-center text-gray-500">계정 정보를 불러오는 중...</p>
      ) : !user ? (
        <section className="mt-8 rounded-2xl border border-gray-200 bg-gray-50 px-6 py-16 text-center">
          <p className="text-gray-700">예약 내역을 보려면 로그인해 주세요.</p>
          <button type="button" onClick={() => setShowAuth(true)} className="mt-5 rounded-xl bg-[#0F766E] px-6 py-3 font-semibold text-white hover:bg-[#115E59]">로그인 / 회원가입</button>
        </section>
      ) : loading ? (
        <p className="py-20 text-center text-gray-500">예약 내역을 불러오는 중...</p>
      ) : error ? (
        <p role="alert" className="mt-8 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : bookings.length === 0 ? (
        <section className="mt-8 rounded-2xl border border-gray-200 bg-gray-50 px-6 py-16 text-center">
          <p className="text-gray-700">아직 계정에 연결된 예약이 없습니다.</p>
          <p className="mt-2 text-sm text-gray-500">로그인한 상태로 예약을 만들면 이곳에서 확인할 수 있어요.</p>
          <Link href="/" className="mt-5 inline-block rounded-xl bg-[#0F766E] px-6 py-3 font-semibold text-white hover:bg-[#115E59]">숙소 둘러보기</Link>
        </section>
      ) : (
        <div className="mt-8 space-y-4">
          {bookings.map((booking) => {
            const status = STATUS_LABELS[booking.status] ?? { label: booking.status, style: "bg-gray-100 text-gray-600" };
            return (
              <article key={booking.order_id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">{booking.hotel_name}</h2>
                    {booking.hotel_address && <p className="mt-1 text-sm text-gray-500">{booking.hotel_address}</p>}
                  </div>
                  <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${status.style}`}>{status.label}</span>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-gray-100 pt-4 text-sm sm:grid-cols-4">
                  <div><p className="text-xs text-gray-400">체크인</p><p className="mt-1 font-medium text-gray-800">{formatDate(booking.check_in)}</p></div>
                  <div><p className="text-xs text-gray-400">체크아웃</p><p className="mt-1 font-medium text-gray-800">{formatDate(booking.check_out)}</p></div>
                  <div><p className="text-xs text-gray-400">인원 · 숙박</p><p className="mt-1 font-medium text-gray-800">{booking.guests}명 · {booking.nights}박</p></div>
                  <div><p className="text-xs text-gray-400">예약 금액</p><p className="mt-1 font-semibold text-gray-900">₩{booking.amount.toLocaleString()}</p></div>
                </div>
                <p className="mt-4 text-xs text-gray-400">주문 번호 · {booking.order_id}</p>
              </article>
            );
          })}
        </div>
      )}

      <p className="mt-8 text-xs leading-5 text-gray-400">Staywise 데모 예약입니다. 결제 상태는 테스트 결제 흐름을 표시하며 실제 숙소 재고나 운영자의 예약 확정과 연결되지 않습니다.</p>
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </main>
  );
}
