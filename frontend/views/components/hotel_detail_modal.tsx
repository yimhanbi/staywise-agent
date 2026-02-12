import type { MouseEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface HotelDetailModalProps {
  hotel: any | null;
  isOpen: boolean;
  onClose: () => void;
}

export const HotelDetailModal = ({ hotel, isOpen, onClose }: HotelDetailModalProps) => {
  return (
    <AnimatePresence>
      {isOpen && hotel && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 md:p-8"
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
                className="p-2 bg-white rounded-full shadow-md hover:bg-gray-100 transition border border-gray-200"
                aria-label="닫기"
              >
                <svg viewBox="0 0 32 32" className="w-4 h-4" fill="none" stroke="black" strokeWidth="3">
                  <path d="M6 6L26 26M26 6L6 26" />
                </svg>
              </button>
            </div>

            <div className="overflow-y-auto w-full">
              <div className="grid grid-cols-4 gap-2 h-[300px] md:h-[450px] w-full p-4">
                <div className="col-span-2 row-span-2 relative overflow-hidden rounded-l-2xl">
                  <img
                    src={hotel.image_url ?? hotel.imageUrl ?? `https://picsum.photos/seed/${hotel.id}/600/600`}
                    className="w-full h-full object-cover hover:scale-105 transition duration-500"
                    alt={hotel.name}
                  />
                </div>
                <div className="col-span-1 h-full relative overflow-hidden">
                  <img
                    src={`https://picsum.photos/seed/${hotel.id}1/400/300`}
                    className="w-full h-full object-cover hover:scale-105 transition duration-500"
                    alt={`${hotel.name} gallery 1`}
                  />
                </div>
                <div className="col-span-1 h-full relative overflow-hidden rounded-tr-2xl">
                  <img
                    src={`https://picsum.photos/seed/${hotel.id}2/400/300`}
                    className="w-full h-full object-cover hover:scale-105 transition duration-500"
                    alt={`${hotel.name} gallery 2`}
                  />
                </div>
                <div className="col-span-1 h-full relative overflow-hidden">
                  <img
                    src={`https://picsum.photos/seed/${hotel.id}3/400/300`}
                    className="w-full h-full object-cover hover:scale-105 transition duration-500"
                    alt={`${hotel.name} gallery 3`}
                  />
                </div>
                <div className="col-span-1 h-full relative overflow-hidden rounded-br-2xl">
                  <img
                    src={`https://picsum.photos/seed/${hotel.id}4/400/300`}
                    className="w-full h-full object-cover hover:scale-105 transition duration-500"
                    alt={`${hotel.name} gallery 4`}
                  />
                </div>
              </div>

              <div className="flex flex-col md:flex-row px-8 py-10 gap-12">
                <div className="flex-[1.5] space-y-6">
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900">{hotel.name}</h2>
                    <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                      <span className="flex items-center gap-1 font-bold text-black">★ {hotel.rating ?? 4.8}</span>
                      <span>•</span>
                      <span className="underline cursor-pointer font-medium">후기 {hotel.reviews ?? 120}개</span>
                      <span>•</span>
                      <span>{hotel.address}</span>
                    </div>
                  </div>

                  {hotel.badges?.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {hotel.badges.map((badge: string) => (
                        <span
                          key={badge}
                          className="text-xs px-2 py-1 bg-gray-100 rounded-full text-gray-700"
                        >
                          {badge}
                        </span>
                      ))}
                    </div>
                  )}

                  <hr className="border-gray-100" />

                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-tr from-[#FF385C] to-[#BD1E59] rounded-full flex items-center justify-center text-white font-bold">
                      AI
                    </div>
                    <div>
                      <h4 className="font-bold text-lg">StayWise AI님이 호스팅하는 숙소</h4>
                      <p className="text-sm text-gray-500">최대 인원 4명 · 침실 2개 · 침대 2개 · 욕실 1개</p>
                    </div>
                  </div>

                  <hr className="border-gray-100" />

                  <p className="text-gray-700 leading-relaxed text-lg whitespace-pre-line">
                    {hotel.description || "이 숙소는 아름다운 전망과 편안한 휴식을 제공합니다. StayWise가 엄선한 리스트 중 하나로, 주변 관광지와 인접해 있어 여행하기에 매우 편리합니다."}
                  </p>

                  {(hotel.urgency || hotel.urgency_message) && (
                    <p className="text-sm text-rose-600 font-medium">
                      🔥 {hotel.urgency || hotel.urgency_message}
                    </p>
                  )}
                </div>

                <div className="flex-1">
                  <div className="border border-gray-200 rounded-2xl p-6 shadow-xl sticky top-4 bg-white">
                    <div className="flex justify-between items-end mb-6">
                      <div>
                        <span className="text-2xl font-bold">₩{(hotel.price ?? hotel.price_per_night ?? 0).toLocaleString()}</span>
                        <span className="text-gray-500 font-normal"> /박</span>
                      </div>
                    </div>

                    <div className="border border-gray-400 rounded-xl overflow-hidden mb-4">
                      <div className="grid grid-cols-2 border-b border-gray-400">
                        <div className="p-3 border-r border-gray-400 hover:bg-gray-50 cursor-pointer">
                          <label className="block text-[10px] font-extrabold uppercase text-gray-900">체크인</label>
                          <div className="text-sm text-gray-500">날짜 추가</div>
                        </div>
                        <div className="p-3 hover:bg-gray-50 cursor-pointer">
                          <label className="block text-[10px] font-extrabold uppercase text-gray-900">체크아웃</label>
                          <div className="text-sm text-gray-500">날짜 추가</div>
                        </div>
                      </div>
                      <div className="p-3 hover:bg-gray-50 cursor-pointer">
                        <label className="block text-[10px] font-extrabold uppercase text-gray-900">게스트</label>
                        <div className="text-sm text-gray-500">게스트 1명</div>
                      </div>
                    </div>

                    <button className="w-full bg-[#FF385C] text-white py-3.5 rounded-xl font-bold text-lg hover:bg-[#D70466] transition-colors shadow-lg active:scale-95 transition-transform">
                      예약하기
                    </button>

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
