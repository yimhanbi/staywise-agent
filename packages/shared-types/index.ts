import { z } from "zod";

export const SearchParamsSchema = z.object({
  location: z.string().optional(),
  checkIn: z.string().optional(),
  checkOut: z.string().optional(),
  adults: z.number().default(1),
  children: z.number().default(0),
  category: z.string().optional(),
  page: z.number().int().positive().optional(),
});

export type SearchParamsInput = z.input<typeof SearchParamsSchema>;
export type SearchParams = z.infer<typeof SearchParamsSchema>;

export interface Hotel {
  id: string | number;
  name: string;
  address: string;
  category?: string;
  price_per_night?: number;
  price?: number;
  rating?: number;
  reviews?: number;
  date_range?: string;
  stay_nights?: number;
  description?: string;
  urgency?: string | null;
  urgency_message?: string | null;
  badges?: string[];
  hotel_type?: string;
  imageUrl?: string;
  image_url?: string;
  max_guests?: number;
  bedrooms?: number;
  beds?: number;
  bathrooms?: number;
}
