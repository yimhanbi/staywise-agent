// views/components/hotel_card.tsx
export const HotelCard = ({ hotel, onClick }: { hotel: any; onClick?: () => void }) => {
  const imageSrc = hotel.image_url ?? hotel.imageUrl ?? `https://picsum.photos/seed/${hotel.id}/300/200`;
  const nightlyPrice = hotel.price ?? hotel.price_per_night;
  const rating = hotel.rating ?? 4.5;
  const stayNights = hotel.stay_nights ?? 1;
  const totalPrice = typeof nightlyPrice === "number" ? nightlyPrice * stayNights : null;

  return (
    <div
      className="flex flex-col gap-2 group cursor-pointer"
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <div className="aspect-square w-full relative overflow-hidden rounded-xl">
        <img
          src={imageSrc}
          className="object-cover h-full w-full group-hover:scale-110 transition"
          alt={hotel.name}
        />
        <button className="absolute top-3 right-3 text-white/80 hover:text-[#0F766E]">
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="m11.645 20.91-.007-.003c-.125-.063-2.396-1.215-4.63-3.618-2.31-2.484-4.508-5.733-4.508-9.289 0-3.155 2.213-5.5 5-5.5 1.62 0 3.064.767 4 2.003C12.436 3.27 13.88 2.503 15.5 2.503c2.787 0 5 2.345 5 5.5 0 3.556-2.198 6.805-4.508 9.289-2.234 2.403-4.505 3.555-4.63 3.618l-.007.003-.022.012-.01.005z"/></svg>
        </button>
      </div>

      <div className="flex flex-col">
        <div className="flex justify-between items-center">
          <span className="font-bold text-base truncate flex-1">{hotel.name}</span>
          <div className="flex items-center gap-1 text-sm">
            <span>★</span>
            <span>{rating}</span>
          </div>
        </div>

        <span className="text-gray-500 text-sm truncate">{hotel.address}</span>
        <span className="text-gray-500 text-sm">{hotel.date_range || "2월 15일 ~ 20일"}</span>

        <div className="flex flex-row items-center justify-between mt-1">
          <div className="flex items-center gap-1">
            <span className="font-bold">
              {nightlyPrice ? `₩${nightlyPrice.toLocaleString()}` : "별도 문의"}
            </span>
            <span className="font-light text-sm">/ {stayNights}박</span>
          </div>
          <div className="text-xs text-gray-400 underline cursor-pointer">
            {totalPrice ? `총액 ₩${totalPrice.toLocaleString()}` : ""}
          </div>
        </div>
      </div>
    </div>
  );
};
