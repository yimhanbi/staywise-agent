"use client";

export interface HomeViewModel {
  title: string;
  description: string;
}

export function useHomeViewModel(): HomeViewModel {
  return {
    title: "Staywise 호텔 예약",
    description: "AI와 함께 호텔을 검색하고 예약해 보세요.",
  };
}
