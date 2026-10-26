import { useEffect, useState, type MouseEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { addDays, format, parseISO } from "date-fns";
import KakaoMap from "@/components/KakaoMap";
import { getHotelImage } from "@/lib/hotel-images";

interface HotelDetailModalProps {
  hotel: any | null;
  isOpen: boolean;
  onClose: () => void;
}

export const HotelDetailModal = ({ hotel, isOpen, onClose }: HotelDetailModalProps) => {
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(1);
  const [bookingError, setBookingError] = useState("");
  const hotelIdNum = Number(hotel?.id) || 0;
  const galleryImages = [0, 1, 2, 3, 4].map((variant) => getHotelImage(hotelIdNum, variant));
  const rawLatitude = hotel?.latitude ?? hotel?.mapy;
  const rawLongitude = hotel?.longitude ?? hotel?.mapx;
  const latitude = rawLatitude == null || rawLatitude === "" ? undefined : Number(rawLatitude);
  const longitude = rawLongitude == null || rawLongitude === "" ? undefined : Number(rawLongitude);
  const hasValidLocation = Number.isFinite(latitude) && Number.isFinite(longitude);
  const today = format(new Date(), "yyyy-MM-dd");
  const minCheckOut = checkIn ? format(addDays(parseISO(checkIn), 1), "yyyy-MM-dd") : today;
  const maxGuests = Math.min(20, Math.max(1, Number(hotel?.max_guests) || 20));

  useEffect(() => {
    if (!isOpen) return;
    setCheckIn("");
    setCheckOut("");
    setGuests(1);
    setBookingError("");
  }, [isOpen, hotel?.id]);

  const continueToBooking = () => {
    setBookingError("");
    if (!checkIn || !checkOut) {
      setBookingError("예약할 체크인과 체크아웃 날짜를 선택해 주세요.");
      return;
    }
    if (checkOut <= checkIn) {
      setBookingError("체크아웃은 체크인 다음 날 이후로 선택해 주세요.");
      return;
    }

    const params = new URLSearchParams({
      hotelId: String(hotelIdNum),
      checkIn,
      checkOut,
      guests: String(guests),
    });
    window.location.href = `/checkout?${params.toString()}`;
  };

  if (isOpen && hotel) {
    console.log("현재 숙소 좌표: ", latitude, longitude);
  }
  

  return (
    <AnimatePresence>
      {isOpen && hotel && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0F172A]/55 backdrop-blur-sm p-4 md:p-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="bg-white w-full max-w-6xl h-full max-h-[90vh] rounded-3xl overflow-hidden relative shadow-2xl flex flex-col"
            onClick={(e: MouseEvent<HTMLDivElement>) => e.stopPropagation()}
          >
            <div className="absolute top-5 left-5 z-50">
              <button
                onClick={onClose}
                className="p-2 bg-white rounded-full shadow-md hover:bg-[#F0FDFA] transition border border-[#99F6E4]"
                aria-label="닫기"
              >
                <svg viewBox="0 0 32 32" className="w-4 h-4" fill="none" stroke="#0F766E" strokeWidth="3">
                  <path d="M6 6L26 26M26 6L6 26" />
                </svg>
              </button>
            </div>

            <div className="overflow-y-auto w-full">
              <div className="grid grid-cols-4 gap-2 h-[300px] md:h-[450px] w-full p-4">
                <div className="col-span-2 row-span-2 relative overflow-hidden rounded-l-2xl">
                  <img
                    src={galleryImages[0]}
                    className="w-full h-full object-cover hover:scale-105 transition duration-500"
                    alt={hotel.name}
                    onError={(e) => {
                      const img = e.currentTarget;
                      img.onerror = null;
                      img.src = getHotelImage(hotelIdNum, 5);
                    }}
                  />
                </div>
                <div className="col-span-1 h-full relative overflow-hidden">
                  <img
                    src={galleryImages[1]}
                    className="w-full h-full object-cover hover:scale-105 transition duration-500"
                    alt={`${hotel.name} 갤러리 1`}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = getHotelImage(hotelIdNum, 6);
                    }}
                  />
                </div>
                <div className="col-span-1 h-full relative overflow-hidden rounded-tr-2xl">
                  <img
                    src={galleryImages[2]}
                    className="w-full h-full object-cover hover:scale-105 transition duration-500"
                    alt={`${hotel.name} 갤러리 2`}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = getHotelImage(hotelIdNum, 7);
                    }}
                  />
                </div>
                <div className="col-span-1 h-full relative overflow-hidden">
                  <img
                    src={galleryImages[3]}
                    className="w-full h-full object-cover hover:scale-105 transition duration-500"
                    alt={`${hotel.name} 갤러리 3`}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = getHotelImage(hotelIdNum, 8);
                    }}
                  />
                </div>
                <div className="col-span-1 h-full relative overflow-hidden rounded-br-2xl">
                  <img
                    src={galleryImages[4]}
                    className="w-full h-full object-cover hover:scale-105 transition duration-500"
                    alt={`${hotel.name} 갤러리 4`}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = getHotelImage(hotelIdNum, 9);
                    }}
                  />
                </div>
              </div>

              <div className="flex flex-col md:flex-row px-8 py-10 gap-12">
                <div className="flex-[1.5] space-y-6">
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900">{hotel.name}</h2>
                    <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                      <span className="font-medium text-gray-500">{hotel.rating == null ? "평점 정보 없음" : `★ ${hotel.rating}`}</span>
                      <span>•</span>
                      <span>{hotel.address}</span>
                    </div>
                  </div>

                  {hotel.badges?.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {hotel.badges.map((badge: string) => (
                        <span
                          key={badge}
                          className="text-xs px-2 py-1 bg-[#F0FDFA] rounded-full text-[#115E59] border border-[#99F6E4]"
                        >
                          {badge}
                        </span>
                      ))}
                    </div>
                  )}

                  <hr className="border-gray-100" />

                  <div className="flex items-center gap-4 py-6 border-b border-gray-100">
                    <div className="w-12 h-12 bg-[#2D6A6A] rounded-full flex items-center justify-center text-white font-bold text-sm">
                      공
                    </div>
                    <div className="flex flex-col">
                      <h4 className="text-lg font-bold text-black">공공 숙박 정보</h4>
                      <p className="text-sm text-gray-600">객실 구성과 수용 인원 정보는 제공되지 않습니다.</p>
                    </div>
                  </div>

                  <hr className="border-gray-100" />

                  <p className="text-gray-700 leading-relaxed text-lg whitespace-pre-line">
                    {hotel.description || "공공 숙박 정보에 등록된 업소입니다."}
                  </p>

                  {(hotel.urgency || hotel.urgency_message) && (
                    <p className="text-sm text-[#0F766E] font-semibold">
                      🔥 {hotel.urgency || hotel.urgency_message}
                    </p>
                  )}

                  <hr className="border-gray-100" />

                  <div className="py-8">
                    <h3 className="text-2xl font-bold text-gray-900 mb-6">호스팅 지역</h3>
                    <div className="w-full h-[400px] md:h-[480px] rounded-2xl overflow-hidden shadow-inner border border-gray-100 relative bg-gray-50">
                      {hasValidLocation ? (
                        <KakaoMap
                          latitude={latitude}
                          longitude={longitude}
                          hotelName={hotel.name}
                        />
                      ) : hotel.address ? (
                        <KakaoMap
                          address={hotel.address}
                          hotelName={hotel.name}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                          <span className="text-4xl mb-2">📍</span>
                          <p className="font-medium">위치 정보를 불러올 수 없습니다.</p>
                        </div>
                      )}
                    </div>

                    <div className="mt-6">
                      <h4 className="text-lg font-bold text-gray-900">{hotel.address}</h4>
                      <p className="text-gray-600 mt-2 leading-relaxed">
                        지도는 제공된 주소 또는 좌표를 기준으로 표시합니다. 실제 객실 정보와 예약 가능 여부는 확인되지 않습니다.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex-1">
                  <div className="border border-gray-200 rounded-2xl p-6 shadow-xl sticky top-4 bg-white">
                    <div className="flex justify-between items-end mb-6">
                      <div>
                        <span className="text-2xl font-bold">₩{(hotel.price ?? hotel.price_per_night ?? 0).toLocaleString()}</span>
                        <span className="text-xs text-amber-700">예시 요금 · 실제 판매가 아님</span>
                        <span className="text-gray-500 font-normal"> /박</span>
                      </div>
                    </div>

                    <div className="border border-[#99F6E4] rounded-xl overflow-hidden mb-4">
                      <div className="grid grid-cols-2 border-b border-[#99F6E4]">
                        <label className="p-3 border-r border-[#99F6E4] hover:bg-[#F0FDFA]">
                          <span className="block text-[10px] font-extrabold uppercase text-gray-900">체크인</span>
                          <input
                            id="modal-check-in"
                            name="checkIn"
                            type="date"
                            min={today}
                            value={checkIn}
                            onChange={(event) => {
                              const nextCheckIn = event.target.value;
                              setCheckIn(nextCheckIn);
                              if (checkOut && checkOut <= nextCheckIn) setCheckOut("");
                              setBookingError("");
                            }}
                            className="mt-1 w-full min-w-0 bg-transparent text-sm text-gray-700 outline-none"
                          />
                        </label>
                        <label className="p-3 hover:bg-[#F0FDFA]">
                          <span className="block text-[10px] font-extrabold uppercase text-gray-900">체크아웃</span>
                          <input
                            id="modal-check-out"
                            name="checkOut"
                            type="date"
                            min={minCheckOut}
                            value={checkOut}
                            disabled={!checkIn}
                            onChange={(event) => {
                              setCheckOut(event.target.value);
                              setBookingError("");
                            }}
                            className="mt-1 w-full min-w-0 bg-transparent text-sm text-gray-700 outline-none disabled:text-gray-400"
                          />
                        </label>
                      </div>
                      <label className="block p-3 hover:bg-[#F0FDFA]">
                        <span className="block text-[10px] font-extrabold uppercase text-gray-900">게스트</span>
                        <select
                          id="modal-guests"
                          name="guests"
                          value={guests}
                          onChange={(event) => setGuests(Number(event.target.value))}
                          className="mt-1 w-full bg-transparent text-sm text-gray-700 outline-none"
                        >
                          {Array.from({ length: maxGuests }, (_, index) => index + 1).map((count) => (
                            <option key={count} value={count}>게스트 {count}명</option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <button
                      type="button"
                      onClick={continueToBooking}
                      className="w-full bg-[#0F766E] text-white py-3.5 rounded-xl font-bold text-lg hover:bg-[#115E59] transition-colors shadow-lg active:scale-95 transition-transform"
                    >
                      예약하기
                    </button>

                    {bookingError && <p role="alert" className="mt-3 text-center text-xs text-red-600">{bookingError}</p>}

                    <p className="text-center text-gray-500 text-xs mt-4 italic">예약 확정 전에는 요금이 청구되지 않습니다.</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
