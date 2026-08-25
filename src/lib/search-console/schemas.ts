import { z } from "zod";

export const gscRowSchema = z.object({
  keys: z.array(z.string()),
  clicks: z.number(),
  impressions: z.number(),
  ctr: z.number(),
  position: z.number(),
});
export type GscRow = z.infer<typeof gscRowSchema>;

export const gscQueryResponseSchema = z.object({
  rows: z.array(gscRowSchema).default([]),
});
