'use client';

import { useCallback, useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Hotel } from "@staywise/shared-types";
import { hotelService } from "@/services/hotelService";
import { HotelCard } from "./components/hotel_card";
import { HotelSkeleton } from "./components/hotel_skeleton";
import { HotelDetailModal } from "./components/hotel_detail_modal";
import { SearchBar } from "./components/searchbar";
import { AiChatDrawer } from "./components/ai_chat_drawer";
import { CATEGORIES, getCategoryValue } from "@/constants/categories";
import { useAuth } from "@/views/auth_context";
import { AuthModal } from "./components/auth_modal";

interface HomeViewProps {
  title: string;
  description: string;
}

interface SearchFilters {
  checkIn?: string;
  checkOut?: string;
  adults: number;
  children: number;
}

export const HomeView = ({ title, description }: HomeViewProps) => {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchError, setSearchError] = useState("");
  const [activeCategory, setActiveCategory] = useState("전체");
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    adults: 1,
    children: 0,
  });
  const [selectedHotel, setSelectedHotel] = useState<any | null>(null);
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [favoriteError, setFavoriteError] = useState("");
  const { user, favorites, favoriteIds, logout, toggleFavorite } = useAuth();


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



  const fetchLoadHotels = useCallback(async (
    q?: string,
    category?: string,
    pageNum: number = 1,
    filters: SearchFilters = { adults: 1, children: 0 },
  ) => {
    if (filters.checkIn && filters.checkOut && filters.checkOut <= filters.checkIn) {
      setSearchError("체크아웃 날짜는 체크인 날짜보다 뒤여야 합니다. 날짜를 다시 선택해 주세요.");
      setHasMore(false);
      setIsLoading(false);
      if (pageNum > 1) setPage(1);
      return;
    }

    setSearchError("");
    setIsLoading(true);
    try {
      // 카테고리 label을 백엔드 value로 변환
      const categoryValue = category === "전체" ? undefined : getCategoryValue(category ?? "전체");
      
      const data = await hotelService.fetchHotels({
        location: q,
        category: categoryValue,
        checkIn: filters.checkIn,
        checkOut: filters.checkOut,
        adults: filters.adults,
        children: filters.children,
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
      setSearchError(error instanceof Error ? error.message : "숙소 검색에 실패했습니다. 다시 시도해 주세요.");
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
      fetchLoadHotels(searchQuery.trim() || undefined, activeCategory, page, searchFilters);
    }
  }, [page]); // searchQuery나 category는 handleSearch/handleCategoryClick에서 관리하므로 의존성에서 제외

  const handleSearch = (params: { checkIn?: string; checkOut?: string; adults: number; children: number }) => {
    const nextQuery = searchQuery.trim();
    const nextFilters: SearchFilters = {
      checkIn: params.checkIn,
      checkOut: params.checkOut,
      adults: params.adults,
      children: params.children,
    };
    setSearchFilters(nextFilters);
    setPage(1); // 페이지 초기화
    setHotels([]); // 기존 데이터 비우기
    fetchLoadHotels(nextQuery || undefined, activeCategory, 1, nextFilters);
  };

  const handleCategoryClick = (item: string) => {
    setActiveCategory(item);
    setPage(1); // 페이지 초기화
    setHotels([]); // 기존 데이터 비우기
    fetchLoadHotels(searchQuery.trim() || undefined, item, 1, searchFilters);
  };

  const handleLogoClick = () => {
    const resetFilters: SearchFilters = { adults: 1, children: 0 };
    setSearchQuery("");
    setActiveCategory("전체");
    setSearchFilters(resetFilters);
    setPage(1);
    setHotels([]);
    fetchLoadHotels(undefined, "전체", 1, resetFilters);
  };

  const handleHotelCardClick = (hotel: any) => {
    setSelectedHotel(hotel);
  };

  const handleFavoriteClick = async (hotelId: string | number) => {
    setFavoriteError("");
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    try {
      await toggleFavorite(hotelId);
    } catch (error) {
      setFavoriteError(error instanceof Error ? error.message : "좋아요를 저장하지 못했습니다.");
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setIsProfileOpen(false);
    } catch (error) {
      setFavoriteError(error instanceof Error ? error.message : "로그아웃에 실패했습니다.");
    }
  };

  return (
    <div className="max-w-[2520px] mx-auto xl:px-20 md:px-10 sm:px-2 px-4">
      <nav className="full-bleed-sticky-header pt-4 pb-8 mb-4">
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

          <div className="flex w-full max-w-[980px] items-center gap-3">
            <SearchBar
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
              onSearch={handleSearch}
            />
            <button
              type="button"
              onClick={() => setIsAiChatOpen(true)}
              className="flex h-12 shrink-0 items-center gap-2 rounded-full bg-[#0F766E] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#115E59]"
              aria-label="AI에게 숙소 추천받기"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3.5 14.1 9l5.4 2.1-5.4 2.1-2.1 5.3-2.1-5.3L4.5 11.1 9.9 9 12 3.5Z" /><path d="m19 15 .9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15Z" /></svg>
              <span className="hidden sm:inline">AI에게 물어보기</span>
              <span className="sm:hidden">AI</span>
            </button>
          </div>

          <div className="relative flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setIsProfileOpen((open) => !open)}
              aria-label="프로필 및 좋아요한 숙소"
              aria-expanded={isProfileOpen}
              className="grid h-10 w-10 place-items-center rounded-full bg-[#F2F2F2] text-gray-700 transition hover:bg-[#E8E8E8]"
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <circle cx="12" cy="12" r="9.25" />
                <circle cx="12" cy="9" r="3.1" />
                <path strokeLinecap="round" d="M5.8 18.7c1.2-2.8 3.3-4.2 6.2-4.2s5 1.4 6.2 4.2" />
              </svg>
            </button>

            {isProfileOpen && (
              <section className="absolute right-0 top-full z-[70] mt-3 w-60 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-gray-100 bg-white py-1 text-left shadow-[0_12px_40px_rgba(0,0,0,0.16)]" aria-label="프로필 메뉴">
                <Link href="/" onClick={() => setIsProfileOpen(false)} className="block px-4 py-3 text-sm text-gray-700 transition hover:bg-gray-50">숙소 둘러보기</Link>
                {user ? (
                  <>
                    <Link href="/favorites" onClick={() => setIsProfileOpen(false)} className="flex items-center justify-between px-4 py-3 text-sm text-gray-700 transition hover:bg-gray-50">
                      <span>좋아요한 숙소</span><span className="text-xs text-gray-400">{favorites.length}</span>
                    </Link>
                    <Link href="/bookings" onClick={() => setIsProfileOpen(false)} className="block px-4 py-3 text-sm text-gray-700 transition hover:bg-gray-50">예약 내역</Link>
                    <div className="my-1 border-t border-gray-100" />
                    <p className="truncate px-4 py-2 text-xs text-gray-500">{user.email}</p>
                    <button type="button" onClick={() => void handleLogout()} className="w-full px-4 py-3 text-left text-sm text-gray-700 transition hover:bg-gray-50">로그아웃</button>
                  </>
                ) : (
                  <button type="button" onClick={() => { setIsProfileOpen(false); setIsAuthModalOpen(true); }} className="w-full px-4 py-3 text-left text-sm font-semibold text-gray-900 transition hover:bg-gray-50">로그인 / 회원가입</button>
                )}
              </section>
            )}
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

      <p className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
        포트폴리오 데모 데이터입니다. 숙소명·주소는 공공 숙박 정보이며, 사진은 예시 이미지입니다. 요금은 예시 금액이고 평점·객실 정보·실시간 예약 가능 여부는 제공되지 않습니다.
      </p>

      {/* 그리드 영역 */}
      {favoriteError && <p role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{favoriteError}</p>}
      <div className="pb-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-8">
        {hotels.map((hotel, index) => {
          // 중복 키 방지를 위해 hotel.id와 index를 조합
          const uniqueKey = `${hotel.id}-${index}`;
          
          if (hotels.length === index + 1) {
            return (
              <div ref={lastHotelElementRef} key={uniqueKey}>
                <HotelCard hotel={hotel} onClick={() => handleHotelCardClick(hotel)} isFavorite={favoriteIds.has(String(hotel.id))} onFavoriteClick={handleFavoriteClick} />
              </div>
            );
          } else {
            return <HotelCard key={uniqueKey} hotel={hotel} onClick={() => handleHotelCardClick(hotel)} isFavorite={favoriteIds.has(String(hotel.id))} onFavoriteClick={handleFavoriteClick} />;
          }
        })}
        
        {isLoading && Array.from({ length: 6 }).map((_, i) => (
          <HotelSkeleton key={`skeleton-${i}`} />
        ))}
      </div>

      {searchError && (
        <p className="mb-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {searchError}
        </p>
      )}

      {!isLoading && hotels.length === 0 && (
        <p className="col-span-full text-center py-20 text-gray-500">조회된 숙소가 없습니다.</p>
      )}

      <HotelDetailModal
        hotel={selectedHotel}
        isOpen={Boolean(selectedHotel)}
        onClose={() => setSelectedHotel(null)}
      />
      <AiChatDrawer
        isOpen={isAiChatOpen}
        onClose={() => setIsAiChatOpen(false)}
        onStartBooking={(hotel, search, conversationId) => {
          const params = new URLSearchParams({ hotelId: String(hotel.id) });
          if (search?.checkIn) params.set("checkIn", search.checkIn);
          if (search?.checkOut) params.set("checkOut", search.checkOut);
          if (search?.guests) params.set("guests", String(search.guests));
          if (conversationId) params.set("conversationId", conversationId);
          window.location.href = `/checkout?${params.toString()}`;
        }}
        onSelectHotel={(hotel) => {
          setIsAiChatOpen(false);
          setSelectedHotel(hotel);
        }}
        onApplySearch={(search) => {
          const nextCategory = search.category ?? "전체";
          const nextFilters: SearchFilters = {
            ...searchFilters,
            adults: search.guests ?? searchFilters.adults,
          };
          setSearchQuery(search.location ?? "");
          setActiveCategory(nextCategory);
          setSearchFilters(nextFilters);
          setPage(1);
          setHotels([]);
          fetchLoadHotels(search.location, nextCategory, 1, nextFilters);
          setIsAiChatOpen(false);
        }}
      />
      {isAuthModalOpen && <AuthModal onClose={() => setIsAuthModalOpen(false)} />}
    </div>
  );
};
