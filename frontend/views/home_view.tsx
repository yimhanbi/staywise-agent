'use client';

import { useCallback, useEffect, useState, useRef } from "react";
import { Hotel } from "@staywise/shared-types";
import { hotelService } from "@/services/hotelService";
import { HotelCard } from "./components/hotel_card";
import { HotelSkeleton } from "./components/hotel_skeleton";
import { HotelDetailModal } from "./components/hotel_detail_modal";
import { SearchBar } from "./components/searchbar";
import { CATEGORIES, getCategoryValue } from "@/constants/categories";

interface HomeViewProps {
  title: string;
  description: string;
}

export const HomeView = ({ title, description }: HomeViewProps) => {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("전체");
  const [selectedHotel, setSelectedHotel] = useState<any | null>(null);


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
      // 카테고리 label을 백엔드 value로 변환
      const categoryValue = category === "전체" ? undefined : getCategoryValue(category ?? "전체");
      
      const data = await hotelService.fetchHotels({
        location: q,
        category: categoryValue,
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
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedHotel(null);
      }
    };

    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("keydown", handleEsc);
    };
  }, []);

  // 2. 페이지 번호가 바뀔 때만 추가 데이터 로드 (page 2 이상부터)
  useEffect(() => {
    if (page > 1) {
      fetchLoadHotels(searchQuery.trim() || undefined, activeCategory, page);
    }
  }, [page]); // searchQuery나 category는 handleSearch/handleCategoryClick에서 관리하므로 의존성에서 제외

  const handleSearch = (searchValue?: string) => {
    const nextQuery = (searchValue ?? searchQuery).trim();
    if (typeof searchValue === "string" && searchValue !== searchQuery) {
      setSearchQuery(searchValue);
    }
    setPage(1); // 페이지 초기화
    setHotels([]); // 기존 데이터 비우기
    fetchLoadHotels(nextQuery || undefined, activeCategory, 1);
  };

  const handleCategoryClick = (item: string) => {
    setActiveCategory(item);
    setPage(1); // 페이지 초기화
    setHotels([]); // 기존 데이터 비우기
    fetchLoadHotels(searchQuery.trim() || undefined, item, 1);
  };

  const handleLogoClick = () => {
    setSearchQuery("");
    setActiveCategory("전체");
    setPage(1);
    setHotels([]);
    fetchLoadHotels(undefined, "전체", 1);
  };

  const handleHotelCardClick = (hotel: any) => {
    setSelectedHotel(hotel);
  };

  return (
    <div className="max-w-[2520px] mx-auto xl:px-20 md:px-10 sm:px-2 px-4">
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100 pt-4 pb-8 mb-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div
            className="text-[#0F766E] font-extrabold text-2xl tracking-tighter cursor-pointer"
            onClick={handleLogoClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleLogoClick();
              }
            }}
            aria-label="전체 숙소 조회"
          >
            Staywise
          </div>

          <SearchBar
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            onSearch={handleSearch}
          />

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
          {CATEGORIES.map((category) => (
            <button
              key={category.label}
              type="button"
              onClick={() => handleCategoryClick(category.label)}
              className={`flex flex-col items-center gap-2 pb-2 transition border-b-2 min-w-[60px] ${
                activeCategory === category.label
                  ? "border-[#0F766E] text-[#0F766E] font-semibold"
                  : "border-transparent text-gray-500 hover:text-[#0F766E] hover:border-[#99F6E4]"
              }`}
            >
              <span className="text-2xl">{category.icon}</span>
              <span className="text-xs">{category.label}</span>
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
