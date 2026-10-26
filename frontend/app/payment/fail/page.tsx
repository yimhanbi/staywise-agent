"use client";

import { useEffect, useState } from "react";
import { buildApiUrl } from "@/services/api_client";

export default function PaymentFailPage() {
  const [message, setMessage] = useState("결제가 취소되었거나 완료되지 않았습니다.");
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const detail = params.get("message");
    const orderId = params.get("orderId");
    if (detail) setMessage(detail);
    if (orderId) {
      fetch(buildApiUrl("/payments/fail"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: orderId, message: detail ?? undefined }),
      }).catch(() => {
        // Payment failure remains visible even if logging it to chat is unavailable.
      });
    }
  }, []);

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-5 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-3xl">!</div>
      <h1 className="mt-5 text-2xl font-bold">결제를 완료하지 못했어요</h1>
      <p role="status" className="mt-3 text-gray-600">{message}</p>
      <a href="/" className="mt-7 rounded-xl bg-teal-700 px-6 py-3 font-semibold text-white">숙소로 돌아가기</a>
    </main>
  );
}
