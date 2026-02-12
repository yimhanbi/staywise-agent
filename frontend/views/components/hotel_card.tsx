// views/components/hotel_card.tsx
export const HotelCard = ({ hotel }: { hotel: any }) => {
    return (
      <div className="flex flex-col gap-2 group cursor-pointer">
        {/* 이미지 슬라이더 (에어비앤비 핵심) */}
        <div className="aspect-square w-full overflow-hidden rounded-xl relative">
          <img 
            src={hotel.imageUrl || "https://via.placeholder.com/300"} 
            className="object-cover w-full h-full group-hover:scale-105 transition"
            alt={hotel.name}
          />
          <button className="absolute top-3 right-3 text-white/80 hover:text-rose-500">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="m11.645 20.91-.007-.003c-.125-.063-2.396-1.215-4.63-3.618-2.31-2.484-4.508-5.733-4.508-9.289 0-3.155 2.213-5.5 5-5.5 1.62 0 3.064.767 4 2.003C12.436 3.27 13.88 2.503 15.5 2.503c2.787 0 5 2.345 5 5.5 0 3.556-2.198 6.805-4.508 9.289-2.234 2.403-4.505 3.555-4.63 3.618l-.007.003-.022.012-.01.005z"/></svg>
          </button>
        </div>
  
        {/* 정보 섹션 */}
        <div className="flex justify-between items-start">
          <div className="flex flex-col">
            <span className="font-bold text-[15px]">{hotel.address}</span>
            <span className="text-gray-500 text-[14px]">{hotel.name}</span>
            <span className="text-gray-500 text-[14px]">2월 4일 ~ 28일</span>
            <div className="mt-1">
              <span className="font-bold">₩{hotel.price_per_night?.toLocaleString()}</span>
              <span className="font-light"> /박</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <span>★</span>
            <span className="font-light text-[14px]">4.85</span>
          </div>
        </div>
      </div>
    );
  };