"use client";

import {useState, useEffect} from "react";
import { hotelService } from "../services/hotelService";
import type { Hotel }from "@staywise/shared-types";

export interface HomeViewModel {
  title: string;
  description: string;
  hotels: Hotel[];
  isLoading: boolean;
  searchHotels: (params: {
    location?: string;
    checkIn?: string;
    checkOut?: string;
    adults?: number;
    children?: number;
  }) => Promise<void>;
}

export function useHomeViewModel(): HomeViewModel {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [isLoading,setIsLoading] = useState(false);


  //호텔 목록을 검색하는 로직
  const searchHotels = async (params: {
    location?: string;
    checkIn?: string;
    checkOut?: string;
    adults?: number;
    children?: number;
  }) => {
    setIsLoading(true);
    try {
      //hotelservice를 호출함
      const response = await hotelService.fetchHotels({
        ...params,
        page:1,
      });
      setHotels(response.hotels);
    } catch (error) {
      console.error("호텔 검색 중 오류 발생:",error);
    } finally {
       setIsLoading(false);
    }
  };

  useEffect(() => {
    searchHotels({});
  }, []);


  return {
    title: "Staywise 호텔 예약",
    description: "AI와 함께 호텔을 검색하고 예약해 보세요.",
    hotels,
    isLoading,
    searchHotels,
  }

}
