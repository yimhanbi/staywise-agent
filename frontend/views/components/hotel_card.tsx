// views/components/hotel_card.tsx
import { getHotelImage } from "@/lib/hotel-images";

export const HotelCard = ({ hotel, onClick, isFavorite = false, onFavoriteClick }: {
  hotel: any;
  onClick?: () => void;
  isFavorite?: boolean;
  onFavoriteClick?: (hotelId: string | number) => void;
}) => {
  const providedImage = hotel.image_url ?? hotel.imageUrl;
  const imageSrc =
    providedImage && !providedImage.includes("loremflickr.com")
      ? providedImage
      : getHotelImage(hotel.id);
  const nightlyPrice = hotel.price ?? hotel.price_per_night;
  const rating = hotel.rating;

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
          onError={(e) => {
            const img = e.currentTarget;
            img.onerror = null;
            img.src = getHotelImage(hotel.id, 1);
          }}
        />
        <button
          type="button"
          onClick={(event) => { event.stopPropagation(); onFavoriteClick?.(hotel.id); }}
          aria-label={isFavorite ? `${hotel.name} 좋아요 취소` : `${hotel.name} 좋아요`}
          aria-pressed={isFavorite}
          className={`absolute top-3 right-3 grid h-10 w-10 place-items-center rounded-full bg-black/25 transition hover:scale-105 ${isFavorite ? "text-rose-500" : "text-white hover:text-rose-200"}`}
        >
          <svg className="h-6 w-6 drop-shadow" fill={isFavorite ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="m11.645 20.91-.007-.003c-.125-.063-2.396-1.215-4.63-3.618-2.31-2.484-4.508-5.733-4.508-9.289 0-3.155 2.213-5.5 5-5.5 1.62 0 3.064.767 4 2.003C12.436 3.27 13.88 2.503 15.5 2.503c2.787 0 5 2.345 5 5.5 0 3.556-2.198 6.805-4.508 9.289-2.234 2.403-4.505 3.555-4.63 3.618l-.007.003-.022.012-.01.005z"/></svg>
        </button>
      </div>

      <div className="flex flex-col">
        <div className="flex justify-between items-center">
          <span className="font-bold text-base truncate flex-1">{hotel.name}</span>
          <div className="flex items-center gap-1 text-sm">
            {rating == null ? <span className="text-xs text-gray-500">평점 정보 없음</span> : <><span>★</span><span>{rating}</span></>}
          </div>
        </div>

        <span className="text-gray-500 text-sm truncate">{hotel.address}</span>
        {hotel.date_range && <span className="text-gray-500 text-sm">{hotel.date_range} · {hotel.stay_nights}박</span>}

        <div className="flex flex-row items-center justify-between mt-1">
          <div className="flex items-center gap-1">
            <span className="font-bold">
              {nightlyPrice ? `₩${nightlyPrice.toLocaleString()}` : "별도 문의"}
            </span>
            <span className="font-light text-sm">/ 1박 · 예시 요금</span>
          </div>
        </div>
      </div>
    </div>
  );
};
