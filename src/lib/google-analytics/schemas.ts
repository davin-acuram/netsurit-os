import { z } from "zod";

const gaValueSchema = z.object({ value: z.string() });

const gaRowSchema = z.object({
  dimensionValues: z.array(gaValueSchema),
  metricValues: z.array(gaValueSchema),
});

export const gaReportSchema = z.object({
  dimensionHeaders: z.array(z.object({ name: z.string() })).default([]),
  metricHeaders: z.array(z.object({ name: z.string() })).default([]),
  rows: z.array(gaRowSchema).default([]),
});
export type GaReport = z.infer<typeof gaReportSchema>;

export const gaBatchRunReportsResponseSchema = z.object({
  reports: z.array(gaReportSchema),
});
