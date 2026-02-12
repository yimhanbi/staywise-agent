'use client';

import { FormEvent, useCallback, useEffect, useState } from "react";
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

  const fetchLoadHotels = useCallback(async (q?: string) => {
    setIsLoading(true);
    try {
      const data = await hotelService.fetchHotels({ location: q });
      setHotels(data.items);
    } catch (error) {
      console.error("Failed to load hotels:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLoadHotels();
  }, [fetchLoadHotels]);

  const handleSearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    fetchLoadHotels(trimmed || undefined);
  };

  return (
    <div className="max-w-[2520px] mx-auto xl:px-20 md:px-10 sm:px-2 px-4 py-10">
      <section className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{title}</h1>
        <p className="text-gray-600 mt-2">{description}</p>

        <form onSubmit={handleSearch} className="mt-5">
          <div className="flex gap-2">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="도시/지역으로 검색"
              className="w-full rounded-full border border-gray-300 px-5 py-3 text-sm outline-none focus:border-black"
            />
            <button
              type="submit"
              className="rounded-full bg-black text-white px-5 py-3 text-sm font-medium"
            >
              검색
            </button>
          </div>
        </form>

        <div className="mt-4 flex flex-wrap gap-2">
          {TOOLBAR_ITEMS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => fetchLoadHotels(item === "전체" ? undefined : item)}
              className="px-4 py-2 text-sm rounded-full border border-gray-300 hover:border-black transition"
            >
              {item}
            </button>
          ))}
        </div>
      </section>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-8">
          {Array.from({ length: 12 }).map((_, i) => (
            <HotelSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-8">
          {hotels.length > 0 ? (
            hotels.map((hotel) => <HotelCard key={hotel.id} hotel={hotel} />)
          ) : (
            <p className="col-span-full text-center py-20 text-gray-500">
              조회된 숙소가 없습니다.
            </p>
          )}
        </div>
      )}
    </div>
  );
};
