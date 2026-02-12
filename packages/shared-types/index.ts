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
  id: string;
  name: string;
  address: string;
  price_per_night: number;
  imageUrl?: string;
}
