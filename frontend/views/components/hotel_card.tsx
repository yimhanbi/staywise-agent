// views/components/hotel_card.tsx
export const HotelCard = ({ hotel }: { hotel: any }) => {
  const imageSrc =
    hotel.imageUrl ??
    hotel.image_url ??
    `https://picsum.photos/seed/${hotel.id ?? "staywise"}/300/200`;

  const nightlyPrice = hotel.price_per_night ?? hotel.price;
  const rating = typeof hotel.rating === "number" ? hotel.rating.toFixed(1) : "4.8";

  return (
    <div className="flex flex-col gap-2 group cursor-pointer">
      <div className="aspect-square w-full overflow-hidden rounded-xl relative">
        <img
          src={imageSrc}
          className="object-cover w-full h-full group-hover:scale-105 transition"
          alt={hotel.name}
        />
        <button className="absolute top-3 right-3 text-white/80 hover:text-[#0F766E]">
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="m11.645 20.91-.007-.003c-.125-.063-2.396-1.215-4.63-3.618-2.31-2.484-4.508-5.733-4.508-9.289 0-3.155 2.213-5.5 5-5.5 1.62 0 3.064.767 4 2.003C12.436 3.27 13.88 2.503 15.5 2.503c2.787 0 5 2.345 5 5.5 0 3.556-2.198 6.805-4.508 9.289-2.234 2.403-4.505 3.555-4.63 3.618l-.007.003-.022.012-.01.005z"/></svg>
        </button>
      </div>

      <div className="flex flex-col mt-2">
        <div className="flex justify-between items-center gap-2">
          <div className="font-bold text-[15px] truncate flex-1">{hotel.name}</div>
          <div className="flex items-center gap-1 text-sm shrink-0">
            <span>★</span>
            <span>{rating}</span>
          </div>
        </div>

        <div className="font-light text-gray-500 text-sm truncate">{hotel.address}</div>
        <div className="font-light text-gray-500 text-sm">2월 15일 ~ 20일</div>

        <div className="flex flex-row items-center gap-1 mt-1">
          <div className="font-bold">
            {nightlyPrice ? `₩ ${nightlyPrice.toLocaleString()}` : "별도 문의"}
          </div>
          <div className="font-light text-sm">/ 박</div>
        </div>
      </div>
    </div>
  );
};
