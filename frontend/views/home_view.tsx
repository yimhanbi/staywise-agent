'use client';

import { useCallback, useEffect, useState, useRef, FormEvent } from "react";
import { Hotel } from "@staywise/shared-types";
import { hotelService } from "@/services/hotelService";
import type { DateRange } from "react-day-picker";
import { HotelCard } from "./components/hotel_card";
import { HotelSkeleton } from "./components/hotel_skeleton";
import { HotelDetailModal } from "./components/hotel_detail_modal";
import {
  DatePickerModal,
  formatDateRangeLabel,
} from "./components/date_picker_modal";
import { AnimatePresence, motion } from "framer-motion";

interface HomeViewProps {
  title: string;
  description: string;
}

type SearchTab = "location" | "date" | "guest" | null;
type GuestType = "adults" | "children" | "infants";

const TOOLBAR_ITEMS = ["전체", "가성비", "도심", "바다", "수영장", "조식포함"] as const;
const RECOMMENDED_CITIES = ["서울", "전주", "제주도", "부산"] as const;

interface SearchSectionProps {
  title: string;
  placeholder: string;
  active: boolean;
  onClick: () => void;
  value?: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  isLast?: boolean;
}

const SearchSection = ({
  title,
  placeholder,
  active,
  onClick,
  value,
  onChange,
  readOnly = false,
  isLast = false,
}: SearchSectionProps) => {
  const containerClass = `flex-1 px-6 py-3 cursor-pointer transition ${active ? "bg-white rounded-full" : "hover:bg-gray-100"} ${isLast ? "mr-1" : ""}`;

  if (onChange) {
    return (
      <div onClick={onClick} className={containerClass}>
        <div className="text-[10px] font-extrabold uppercase text-gray-900">{title}</div>
        <input
          className="bg-transparent text-sm text-black font-medium outline-none w-full placeholder:text-gray-400"
          placeholder={placeholder}
          value={value}
          onFocus={onClick}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    );
  }

  if (readOnly && value !== undefined) {
    return (
      <div onClick={onClick} className={containerClass}>
        <div className="text-[10px] font-extrabold uppercase text-gray-900">{title}</div>
        <input
          className="bg-transparent text-sm text-black font-medium outline-none w-full placeholder:text-gray-400 cursor-pointer read-only:cursor-pointer"
          placeholder={placeholder}
          value={value}
          readOnly
          onFocus={onClick}
        />
      </div>
    );
  }

  return (
    <button type="button" onClick={onClick} className={`${containerClass} text-left`}>
      <div className="text-[10px] font-extrabold uppercase text-gray-900">{title}</div>
      <div className="text-sm text-black font-medium mt-0.5">{placeholder}</div>
    </button>
  );
};

export const HomeView = ({ title, description }: HomeViewProps) => {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("전체");
  const [activeTab, setActiveTab] = useState<SearchTab>(null);
  const [selectedHotel, setSelectedHotel] = useState<any | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [dateLabel, setDateLabel] = useState("날짜 추가");
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);


  //무한 스크롤을 위한 상태
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const searchRef = useRef<HTMLDivElement>(null);

  //관찰 대상 (마지막 요소)를 위한 Ref
  const observer = useRef<IntersectionObserver | null>(null);
  const lastHotelElementRef = useCallback((node: HTMLDivElement) => {
    if (isLoading) return;
    if (observer.current) observer.current.disconnect();


    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prevPage => prevPage + 1);
      }
    });


    if(node) observer.current.observe(node);
  }, [isLoading, hasMore]);



  const fetchLoadHotels = useCallback(async (q?: string, category?: string, pageNum: number = 1) => {
    setIsLoading(true);
    try {
      const data = await hotelService.fetchHotels({
        location: q,
        category: category === "전체" ? undefined : category,
        page: pageNum,
      });

      setHotels(prev => {
        // 첫 페이지면 새 데이터로 교체, 그 외에는 기존 데이터 뒤에 추가
        if (pageNum === 1) return data.hotels;


        //중복 데이터 방지 
        const existingIds = new Set(prev.map(h => h.id));
        const filteredNewData = data.hotels.filter(h => !existingIds.has(h.id));
        return [...prev, ...filteredNewData];
      });

// 데이터가 0개이거나 이전에 불러온 데이터와 동일하면 더 이상 데이터가 없는 것으로 판단
      setHasMore(data.count > 0);
    } catch (error) {
      console.error("Failed to load hotels:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 1. 초기 렌더링 시 첫 페이지 로드
  useEffect(() => {
    fetchLoadHotels(undefined, "전체", 1);
  }, [fetchLoadHotels]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!searchRef.current?.contains(event.target as Node)) {
        setActiveTab(null);
      }
    };
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveTab(null);
        setSelectedHotel(null);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, []);

  // 2. 페이지 번호가 바뀔 때만 추가 데이터 로드 (page 2 이상부터)
  useEffect(() => {
    if (page > 1) {
      fetchLoadHotels(searchQuery.trim() || undefined, activeCategory, page);
    }
  }, [page]); // searchQuery나 category는 handleSearch/handleCategoryClick에서 관리하므로 의존성에서 제외

  const handleSearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPage(1); // 페이지 초기화
    setHotels([]); // 기존 데이터 비우기
    fetchLoadHotels(searchQuery.trim() || undefined, activeCategory, 1);
  };

  const handleCategoryClick = (item: string) => {
    setActiveCategory(item);
    setPage(1); // 페이지 초기화
    setHotels([]); // 기존 데이터 비우기
    fetchLoadHotels(searchQuery.trim() || undefined, item, 1);
  };

  const totalGuests = adults + children + infants;
  const guestLabel = totalGuests > 0 ? `게스트 ${totalGuests}명` : "게스트 추가";

  const updateGuestCount = (type: GuestType, delta: -1 | 1) => {
    if (type === "adults") {
      setAdults((prev) => Math.max(1, prev + delta));
      return;
    }
    if (type === "children") {
      setChildren((prev) => Math.max(0, prev + delta));
      return;
    }
    setInfants((prev) => Math.max(0, prev + delta));
  };

  const handleHotelCardClick = (hotel: any) => {
    setSelectedHotel(hotel);
  };

  return (
    <div className="max-w-[2520px] mx-auto xl:px-20 md:px-10 sm:px-2 px-4">
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100 pt-4 pb-8 mb-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-[#0F766E] font-extrabold text-2xl tracking-tighter cursor-pointer">
            Staywise
          </div>

          <div ref={searchRef} className="relative w-full max-w-[850px]">
            <form onSubmit={handleSearch} className="relative">
              <div
                className={`flex items-center rounded-full border transition-all duration-300 ${
                  activeTab
                    ? "bg-white border-gray-200 shadow-xl scale-[1.02]"
                    : "bg-white border-gray-200"
                }`}
              >
                <div className="relative flex-1">
                  <SearchSection
                    title="여행지"
                    placeholder="도시나 명소로 검색"
                    active={activeTab === "location"}
                    onClick={() => setActiveTab("location")}
                    value={searchQuery}
                    onChange={setSearchQuery}
                  />
                  <AnimatePresence>
                    {activeTab === "location" && (
                      <motion.div
                        key="location"
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-[calc(100%+12px)] left-0 z-[110] w-full min-w-[320px] max-w-[420px] bg-white rounded-[32px] border border-gray-100 shadow-xl p-6"
                      >
                        <div className="text-xs font-bold mb-4">추천 여행지</div>
                        <div className="grid grid-cols-1 gap-3">
                          {RECOMMENDED_CITIES.map((city) => (
                            <button
                              key={city}
                              type="button"
                              onClick={() => {
                                setSearchQuery(city);
                                setActiveTab("date");
                              }}
                              className="flex items-center gap-3 hover:bg-gray-100 p-2 rounded-xl text-left"
                            >
                              <div className="p-2 bg-gray-100 rounded-lg">📍</div>
                              <span className="text-sm">{city}</span>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="relative flex-1 overflow-visible">
                  <SearchSection
                    title="날짜"
                    placeholder="날짜 추가"
                    active={activeTab === "date"}
                    onClick={() => setActiveTab("date")}
                    value={dateLabel}
                    readOnly
                  />
                  <AnimatePresence>
                    {activeTab === "date" && (
                      <motion.div
                        key="date"
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-[calc(100%+12px)] left-0 z-[110] w-[680px] bg-white rounded-[32px] border border-gray-100 shadow-xl p-6"
                      >
                        <DatePickerModal
                          selectedRange={dateRange}
                          onSelectRange={(r) => {
                            setDateRange(r);
                            setDateLabel(formatDateRangeLabel(r));
                            if (r?.from && r?.to) setActiveTab("guest");
                          }}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="relative flex-1 mr-1">
                  <SearchSection
                    title="여행자"
                    placeholder="게스트 추가"
                    active={activeTab === "guest"}
                    onClick={() => setActiveTab("guest")}
                    value={guestLabel}
                    readOnly
                    isLast
                  />
                  <AnimatePresence>
                    {activeTab === "guest" && (
                      <motion.div
                        key="guest"
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-[calc(100%+12px)] left-0 z-[110] w-full min-w-[320px] max-w-[420px] bg-white rounded-[32px] border border-gray-100 shadow-xl p-6"
                      >
                        <div className="text-xs font-bold mb-4">인원 선택</div>
                        <div className="space-y-3">
                          {[
                            { key: "adults", label: "성인", desc: "13세 이상", value: adults },
                            { key: "children", label: "어린이", desc: "2~12세", value: children },
                            { key: "infants", label: "유아", desc: "2세 미만", value: infants },
                          ].map((guest) => (
                            <div key={guest.key} className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-semibold">{guest.label}</p>
                                <p className="text-xs text-gray-500">{guest.desc}</p>
                              </div>
                              <div className="flex items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() => updateGuestCount(guest.key as GuestType, -1)}
                                  className="h-8 w-8 rounded-full border border-gray-300 text-gray-600 hover:border-[#0F766E] hover:text-[#0F766E]"
                                >
                                  -
                                </button>
                                <span className="w-4 text-center">{guest.value}</span>
                                <button
                                  type="button"
                                  onClick={() => updateGuestCount(guest.key as GuestType, 1)}
                                  className="h-8 w-8 rounded-full border border-gray-300 text-gray-600 hover:border-[#0F766E] hover:text-[#0F766E]"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => setActiveTab(null)}
                            className="w-full mt-2 rounded-xl bg-[#0F766E] text-white py-2 text-sm font-semibold hover:bg-[#115E59]"
                          >
                            적용
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="pr-2">
                  <button
                    type="submit"
                    className="bg-[#0F766E] text-white px-6 py-3 rounded-full flex items-center gap-2 font-bold hover:bg-[#115E59] transition"
                    aria-label="검색"
                  >
                    <svg viewBox="0 0 32 32" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="4">
                      <circle cx="14" cy="14" r="10" />
                      <path d="M21 21l7 7" />
                    </svg>
                    검색
                  </button>
                </div>
              </div>
            </form>
          </div>

          <div className="hidden md:block w-[100px] text-right">
            <button
              type="button"
              className="text-sm font-semibold p-2 hover:bg-gray-100 rounded-full"
              title={title}
              aria-label={description}
            >
              로그인
            </button>
          </div>
        </div>

        <div className="mt-8 pt-4 flex items-center gap-8 overflow-x-auto no-scrollbar">
          {TOOLBAR_ITEMS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => handleCategoryClick(item)}
              className={`flex flex-col items-center gap-2 pb-2 transition border-b-2 min-w-[60px] ${
                activeCategory === item
                  ? "border-[#0F766E] text-[#0F766E] font-semibold"
                  : "border-transparent text-gray-500 hover:text-[#0F766E] hover:border-[#99F6E4]"
              }`}
            >
              <span className="text-xs">{item}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* 그리드 영역 */}
      <div className="pb-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-8">
        {hotels.map((hotel, index) => {
          // 중복 키 방지를 위해 hotel.id와 index를 조합
          const uniqueKey = `${hotel.id}-${index}`;
          
          if (hotels.length === index + 1) {
            return (
              <div ref={lastHotelElementRef} key={uniqueKey}>
                <HotelCard hotel={hotel} onClick={() => handleHotelCardClick(hotel)} />
              </div>
            );
          } else {
            return <HotelCard key={uniqueKey} hotel={hotel} onClick={() => handleHotelCardClick(hotel)} />;
          }
        })}
        
        {isLoading && Array.from({ length: 6 }).map((_, i) => (
          <HotelSkeleton key={`skeleton-${i}`} />
        ))}
      </div>

      {!isLoading && hotels.length === 0 && (
        <p className="col-span-full text-center py-20 text-gray-500">조회된 숙소가 없습니다.</p>
      )}

      <HotelDetailModal
        hotel={selectedHotel}
        isOpen={Boolean(selectedHotel)}
        onClose={() => setSelectedHotel(null)}
      />
    </div>
  );
};
