import { SearchParamsSchema } from "@staywise/shared-types";
import type { Hotel, SearchParamsInput } from "@staywise/shared-types";
import { buildApiUrl } from "./api_client";

interface HotelListResponse {
  hotels: Hotel[];
  total: number;
  count: number;
}

export const hotelService = {
  async fetchHotels(
    params: SearchParamsInput = {},
  ): Promise<HotelListResponse> {
    const normalizedParams = SearchParamsSchema.parse(params);
    const query = new URLSearchParams();

    if (normalizedParams.location) {
      query.append("location", normalizedParams.location);
    }
    if (normalizedParams.category && normalizedParams.category !== "전체") {
      query.append("category", normalizedParams.category);
    }

    const pageCandidate = (params as SearchParamsInput & { page?: number }).page;
    const page =
      typeof pageCandidate === "number" && Number.isFinite(pageCandidate) && pageCandidate > 0
        ? Math.floor(pageCandidate)
        : 1;
    query.append("page", page.toString());

    const queryString = query.toString();
    const baseUrl = buildApiUrl("/hotels");
    const url = queryString ? `${baseUrl}?${queryString}` : baseUrl;

    let response: Response;
    try {
      response = await fetch(url, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      throw new Error(`Failed to fetch hotels (network error) [${url}]`, {
        cause: error as Error,
      });
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(
        `Failed to fetch hotels (${response.status} ${response.statusText}) [${url}] ${errorText}`.trim(),
      );
    }

    return (await response.json()) as HotelListResponse;
  },

  async getHotelById(id: string): Promise<Hotel> {
    const url = buildApiUrl(`/hotels/${id}`);
    const response = await fetch(url);
    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(
        `Hotel not found (${response.status} ${response.statusText}) [${url}] ${errorText}`.trim(),
      );
    }
    return response.json();
  },
};
