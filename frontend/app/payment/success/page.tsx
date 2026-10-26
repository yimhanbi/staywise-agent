"use client";

import { useEffect, useState } from "react";
import { buildApiUrl } from "@/services/api_client";

type Confirmation = { order_id: string; hotel_name: string; amount: number; status: string };

export default function PaymentSuccessPage() {
  const [message, setMessage] = useState("결제를 확인하고 있습니다…");
  const [booking, setBooking] = useState<Confirmation | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentKey = params.get("paymentKey");
    const orderId = params.get("orderId");
    const amount = Number(params.get("amount"));
    if (!paymentKey || !orderId || !Number.isSafeInteger(amount) || amount <= 0) {
      setMessage("결제 승인 정보가 올바르지 않습니다.");
      return;
    }

    fetch(buildApiUrl("/payments/confirm"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payment_key: paymentKey, order_id: orderId, amount }),
    })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.detail ?? "결제 승인에 실패했습니다.");
        setBooking(body as Confirmation);
        setMessage("테스트 결제가 승인되고 예약이 접수됐습니다.");
      })
      .catch((error: Error) => setMessage(error.message));
  }, []);

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-5 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-teal-100 text-3xl text-teal-700">{booking ? "✓" : "…"}</div>
      <h1 className="mt-5 text-2xl font-bold">{booking ? "예약 완료" : "결제 결과"}</h1>
      <p role="status" className="mt-3 text-gray-600">{message}</p>
      {booking && <p className="mt-2 text-sm text-gray-500">{booking.hotel_name} · ₩{booking.amount.toLocaleString()}</p>}
      <p className="mt-5 max-w-md text-xs leading-5 text-gray-400">Staywise 포트폴리오 테스트 예약입니다. 실제 객실 재고나 숙소 운영자의 예약 확정과는 연결되지 않습니다.</p>
      <a href="/" className="mt-7 rounded-xl bg-teal-700 px-6 py-3 font-semibold text-white">숙소 둘러보기</a>
    </main>
  );
}
