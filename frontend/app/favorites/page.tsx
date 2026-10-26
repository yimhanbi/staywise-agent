"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/views/auth_context";
import { HotelCard } from "@/views/components/hotel_card";
import { HotelDetailModal } from "@/views/components/hotel_detail_modal";
import { AuthModal } from "@/views/components/auth_modal";
import type { Hotel } from "@staywise/shared-types";

export default function FavoritesPage() {
  const { user, favorites, isAuthLoading, toggleFavorite } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);
  const [error, setError] = useState("");

  const removeFavorite = async (hotelId: string | number) => {
    setError("");
    try {
      await toggleFavorite(hotelId);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "좋아요를 취소하지 못했습니다.");
    }
  };

  return (
    <main className="mx-auto min-h-screen max-w-[1600px] px-4 py-8 sm:px-8 lg:px-12">
      <header className="mb-8 flex items-center justify-between border-b border-gray-100 pb-5">
        <Link href="/" className="text-2xl font-extrabold tracking-tight text-[#0F766E]">Staywise</Link>
        <Link href="/" className="rounded-full px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100">숙소 찾기</Link>
      </header>
      <div className="mb-7">
        <h1 className="text-3xl font-bold text-gray-900">좋아요한 숙소</h1>
        <p className="mt-2 text-gray-500">저장한 숙소를 한곳에서 확인하고 관리할 수 있어요.</p>
      </div>

      {error && <p role="alert" className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {isAuthLoading ? (
        <p className="py-20 text-center text-gray-500">계정 정보를 불러오는 중...</p>
      ) : !user ? (
        <section className="rounded-2xl border border-gray-200 bg-gray-50 px-6 py-16 text-center">
          <p className="text-gray-700">좋아요 목록을 보려면 로그인해 주세요.</p>
          <button type="button" onClick={() => setShowAuth(true)} className="mt-5 rounded-xl bg-[#0F766E] px-6 py-3 font-semibold text-white hover:bg-[#115E59]">로그인 / 회원가입</button>
        </section>
      ) : favorites.length === 0 ? (
        <section className="rounded-2xl border border-gray-200 bg-gray-50 px-6 py-16 text-center">
          <p className="text-gray-700">아직 좋아요한 숙소가 없습니다.</p>
          <Link href="/" className="mt-5 inline-block rounded-xl bg-[#0F766E] px-6 py-3 font-semibold text-white hover:bg-[#115E59]">숙소 둘러보기</Link>
        </section>
      ) : (
        <div className="grid grid-cols-1 gap-x-6 gap-y-9 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {favorites.map((hotel) => (
            <HotelCard key={hotel.id} hotel={hotel} isFavorite onFavoriteClick={removeFavorite} onClick={() => setSelectedHotel(hotel)} />
          ))}
        </div>
      )}

      <HotelDetailModal hotel={selectedHotel} isOpen={Boolean(selectedHotel)} onClose={() => setSelectedHotel(null)} />
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </main>
  );
}
