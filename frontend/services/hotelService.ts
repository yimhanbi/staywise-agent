import { SearchParamsSchema } from "@staywise/shared-types";
import type { Hotel, SearchParamsInput } from "@staywise/shared-types";
import { buildApiUrl } from "./api_client";


export const hotelService = {

  async fetchHotels(
    params: SearchParamsInput = {},
  ): Promise<{ items: Hotel[]; total: number }> {
    const normalizedParams = SearchParamsSchema.parse(params);
    const query = new URLSearchParams();
    if (normalizedParams.location) {
      query.append("q", normalizedParams.location);
    }
    const queryString = query.toString();
    const baseUrl = buildApiUrl("/hotels");
    const url = queryString ? `${baseUrl}?${queryString}` : baseUrl;
    const response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) {
      throw new Error("Failed to fetch hotels.");
    }
    return response.json();
  },


  async getHotelById(id: string): Promise<Hotel> {
    const response = await fetch(buildApiUrl(`/hotels/${id}`));
    if (!response.ok) {
      throw new Error("Hotel not found.");
    }
    return response.json();
  },
};
