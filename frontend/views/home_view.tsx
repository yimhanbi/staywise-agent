'use client';

import { useCallback, useEffect, useState, useRef, FormEvent } from "react";
import { Hotel } from "@staywise/shared-types";
import { hotelService } from "@/services/hotelService";
import { HotelCard } from "./components/hotel_card";
import { HotelSkeleton } from "./components/hotel_skeleton";

interface HomeViewProps {
  title: string;
  description: string;
}

const TOOLBAR_ITEMS = ["전체", "가성비", "도심", "바다", "수영장", "조식포함"] as const;

export const HomeView = ({ title, description }: HomeViewProps) => {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("전체");


  //무한 스크롤을 위한 상태
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

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

  return (
    <div className="max-w-[2520px] mx-auto xl:px-20 md:px-10 sm:px-2 px-4">
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100 py-4 mb-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-[#0F766E] font-extrabold text-2xl tracking-tighter cursor-pointer">
            Staywise
          </div>

          <form onSubmit={handleSearch} className="flex-1 max-w-[600px] group">
            <div className="flex items-center border rounded-full pl-6 pr-2 py-2 shadow-sm hover:shadow-md transition-all duration-300 border-gray-200">
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="어디로 떠나세요?"
                className="w-full text-sm outline-none bg-transparent font-light"
              />
              <button
                type="submit"
                className="p-2.5 bg-[#0F766E] hover:bg-[#115E59] rounded-full text-white transition-transform group-hover:scale-105"
              >
                <svg
                  viewBox="0 0 32 32"
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                >
                  <circle cx="14" cy="14" r="10" />
                  <path d="M21 21l7 7" />
                </svg>
              </button>
            </div>
          </form>

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

        <div className="mt-6 flex items-center gap-8 overflow-x-auto no-scrollbar">
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
                <HotelCard hotel={hotel} />
              </div>
            );
          } else {
            return <HotelCard key={uniqueKey} hotel={hotel} />;
          }
        })}
        
        {isLoading && Array.from({ length: 6 }).map((_, i) => (
          <HotelSkeleton key={`skeleton-${i}`} />
        ))}
      </div>

      {!isLoading && hotels.length === 0 && (
        <p className="col-span-full text-center py-20 text-gray-500">조회된 숙소가 없습니다.</p>
      )}
    </div>
  );
};
