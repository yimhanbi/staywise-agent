import React from 'react';

export const HotelSkeleton = () => {
  return (
    <div className="flex flex-col gap-2 w-full animate-pulse">
      {/* 이미지 영역 뼈대 */}
      <div className="aspect-square w-full bg-gray-200 rounded-xl" />
      
      {/* 정보 영역 뼈대 */}
      <div className="flex justify-between items-start mt-2">
        <div className="flex flex-col gap-2 w-full">
          {/* 주소 줄 */}
          <div className="h-4 bg-gray-200 rounded-md w-3/4" />
          {/* 이름 줄 */}
          <div className="h-3 bg-gray-200 rounded-md w-1/2" />
          {/* 가격 줄 */}
          <div className="h-4 bg-gray-200 rounded-md w-1/3 mt-1" />
        </div>
        {/* 별점 영역 뼈대 */}
        <div className="h-4 bg-gray-200 rounded-md w-8" />
      </div>
    </div>
  );
};