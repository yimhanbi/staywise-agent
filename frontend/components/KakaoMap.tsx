"use client";

import { useEffect, useState } from "react";
import { buildApiUrl } from "@/services/api_client";

interface KakaoMapProps {
  latitude?: number;
  longitude?: number;
  address?: string;
  hotelName?: string;
}

export default function KakaoMap({ latitude, longitude, address, hotelName }: KakaoMapProps) {
  const [imageUrl, setImageUrl] = useState("");
  const [mapError, setMapError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const hasCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude);
  const mapParams = new URLSearchParams();

  if (hasCoordinates) {
    mapParams.set("latitude", String(latitude));
    mapParams.set("longitude", String(longitude));
  } else if (address?.trim()) {
    mapParams.set("address", address.trim());
  }

  const query = mapParams.toString();
  const mapImageUrl = query ? `${buildApiUrl("/maps/static")}?${query}` : "";

  useEffect(() => {
    let cancelled = false;
    let objectUrl = "";

    setImageUrl("");
    setMapError("");
    if (!mapImageUrl) {
      setIsLoading(false);
      setMapError("이 숙소에는 지도에 표시할 위치 정보가 없습니다.");
      return;
    }

    setIsLoading(true);
    fetch(mapImageUrl)
      .then(async (response) => {
        if (!response.ok) {
          let detail = `${response.status} ${response.statusText}`;
          try {
            const body = await response.json();
            if (typeof body.detail === "string") detail = body.detail;
          } catch {
            // Keep the HTTP status when the API response isn't JSON.
          }
          throw new Error(detail);
        }

        const image = await response.blob();
        if (!image.type.startsWith("image/")) {
          throw new Error("백엔드 응답이 지도 이미지 형식이 아닙니다.");
        }
        return URL.createObjectURL(image);
      })
      .then((url) => {
        objectUrl = url;
        if (!cancelled) setImageUrl(url);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setMapError(error instanceof Error ? error.message : "지도 요청에 실패했습니다.");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [mapImageUrl]);

  return (
    <div className="relative h-full min-h-[350px] w-full overflow-hidden bg-gray-50">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={hotelName ? `${hotelName} 위치 지도` : "숙소 위치 지도"}
          className="h-full min-h-[350px] w-full object-cover"
        />
      ) : (
        <div className="flex h-full min-h-[350px] items-center justify-center px-6 text-center text-sm text-gray-500">
          {isLoading ? "카카오 지도를 불러오는 중입니다…" : mapError}
        </div>
      )}
      {imageUrl && (
        <span className="absolute bottom-3 right-3 rounded bg-white/90 px-2 py-1 text-[11px] text-gray-600 shadow">
          카카오맵 · 정적 지도
        </span>
      )}
    </div>
  );
}
