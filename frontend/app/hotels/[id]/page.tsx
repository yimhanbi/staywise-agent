'use client';

import { useEffect, useState, use } from "react";
import { hotelService } from "@/services/hotelService";
import { Hotel } from "@staywise/shared-types";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function HotelDetailPage({ params }: PageProps) {
  // Next.js 15+ 방식: params를 use()로 해제합니다.
  const { id } = use(params);
  
  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchHotel = async () => {
      try {
        const data = await hotelService.getHotelById(id);
        setHotel(data);
      } catch (error) {
        console.error("상세 정보 로드 실패:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchHotel();
  }, [id]);

  if (isLoading) return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black"></div>
    </div>
  );
  
  if (!hotel) return <div className="p-10 text-center">숙소를 찾을 수 없습니다.</div>;

  return (
    <main className="max-w-[1100px] mx-auto px-6 py-10">
      {/* 타이틀 영역 */}
      <h1 className="text-3xl font-bold mb-4">{hotel.name}</h1>
      <p className="text-gray-600 underline mb-6">{hotel.address}</p>

      {/* 메인 이미지 */}
      <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-gray-100 mb-10 shadow-lg">
        <img 
          src={hotel.imageUrl || "https://images.unsplash.com/photo-1566073771259-6a8506099945"} 
          alt={hotel.name}
          className="object-cover w-full h-full"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
        {/* 왼쪽: 상세 설명 및 시설 */}
        <div className="md:col-span-2">
          <section className="border-b pb-8 mb-8">
            <h2 className="text-2xl font-semibold mb-2">Staywise가 추천하는 특별한 숙소</h2>
            <p className="text-gray-500">최대 인원 4명 · 침실 2개 · 침대 2개 · 욕실 1개</p>
          </section>

          <section className="mb-10">
            <h3 className="text-xl font-bold mb-6">숙소 편의시설</h3>
            <div className="grid grid-cols-2 gap-y-4">
              <div className="flex items-center gap-3">📶 무선 인터넷</div>
              <div className="flex items-center gap-3">🚗 무료 주차</div>
              <div className="flex items-center gap-3">❄️ 에어컨</div>
              <div className="flex items-center gap-3">🍳 주방 시설</div>
            </div>
          </section>

          {/* 지도 플레이스홀더 */}
          <section>
            <h3 className="text-xl font-bold mb-4">위치 정보</h3>
            <div className="h-[350px] bg-neutral-100 rounded-2xl flex flex-col items-center justify-center border-2 border-dashed border-neutral-300">
              <span className="text-4xl mb-2">📍</span>
              <p className="text-neutral-500 font-medium">지도 서비스 준비 중</p>
            </div>
          </section>
        </div>

        {/* 오른쪽: 예약 카드 (Sticky) */}
        <div className="relative">
          <div className="sticky top-28 border border-neutral-200 rounded-3xl p-8 shadow-2xl bg-white">
            <div className="flex justify-between items-baseline mb-6">
              <span className="text-2xl font-bold">₩{hotel.price_per_night.toLocaleString()}</span>
              <span className="text-neutral-500 text-sm">/ 박</span>
            </div>
            
            <button className="w-full bg-rose-500 text-white py-4 rounded-xl text-lg font-bold hover:bg-rose-600 transition-all active:scale-95">
              예약하기
            </button>
            
            <div className="mt-4 text-center">
              <p className="text-xs text-neutral-400">예약 확정 전에는 결제되지 않습니다.</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}