'use client';

import { useEffect, useRef } from "react";

interface KakaoMapProps{
    latitude?: number;
    longitude?: number;
    address?: string;
    hotelName?: string; 
}

declare global {
    interface Window{
        kakao: any;
    }
}

export default function KakaoMap({ latitude, longitude, address, hotelName }: KakaoMapProps) {
    const mapRef = useRef<HTMLDivElement>(null);


   useEffect(() => {
    let cancelled = false;
    let retryCount = 0;

    const initMap = () => {
      if (cancelled) return;
      if (!window.kakao || !window.kakao.maps) {
        if (retryCount < 20) {
          retryCount += 1;
          window.setTimeout(initMap, 100);
          return;
        }
        console.error("카카오맵 SDK가 로드되지 않았습니다.");
        return;
      }

      window.kakao.maps.load(() => {
        if (!mapRef.current || cancelled) return;

        const container = mapRef.current;
        const hasValidLatLng =
          Number.isFinite(latitude) && Number.isFinite(longitude);

        const options = {
          center: hasValidLatLng
            ? new window.kakao.maps.LatLng(latitude, longitude)
            : new window.kakao.maps.LatLng(37.5665, 126.9780),
          level: 3,
        };

        const map = new window.kakao.maps.Map(container, options);

        const addMarker = (lat: number, lng: number) => {
          const markerPosition = new window.kakao.maps.LatLng(lat, lng);
          const marker = new window.kakao.maps.Marker({
            position: markerPosition,
          });
          marker.setMap(map);
          map.setCenter(markerPosition);

          if (hotelName) {
            const infowindow = new window.kakao.maps.InfoWindow({
              content: `<div style="padding:5px; font-size:12px; color:black; border-radius:4px;">${hotelName}</div>`,
            });
            infowindow.open(map, marker);
          }
        };

        if (hasValidLatLng) {
          addMarker(latitude as number, longitude as number);
          return;
        }

        if (address && window.kakao.maps.services) {
          const geocoder = new window.kakao.maps.services.Geocoder();
          geocoder.addressSearch(address, (result: any[], status: string) => {
            if (status !== window.kakao.maps.services.Status.OK || !result?.length) {
              console.error("주소 기반 위치 검색 실패:", address);
              return;
            }

            const y = Number(result[0].y);
            const x = Number(result[0].x);
            if (!Number.isFinite(y) || !Number.isFinite(x)) {
              return;
            }
            addMarker(y, x);
          });
        }
      });
    };

    initMap();

    return () => {
      cancelled = true;
    };
  }, [latitude, longitude, address, hotelName]);

  return (
    <div 
      ref={mapRef} 
      className="w-full h-full" 
      style={{ minHeight: '350px' }} // 높이가 없으면 지도가 안 보이니 기본 높이 설정
    />
  );
}
