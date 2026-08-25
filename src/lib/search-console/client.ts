import { getAuthClient } from "./oauth";
import { gscEnv } from "./env";

const BASE_URL = "https://www.googleapis.com/webmasters/v3";

export interface GscQueryRequest {
  startDate: string;
  endDate: string;
  dimensions: string[];
  rowLimit: number;
  startRow: number;
}

export async function searchAnalyticsQuery(req: GscQueryRequest): Promise<unknown> {
  const client = getAuthClient();
  const res = await client.request({
    url: `${BASE_URL}/sites/${encodeURIComponent(gscEnv.siteUrl)}/searchAnalytics/query`,
    method: "POST",
    data: req,
  });
  return res.data;
}
