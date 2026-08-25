import { getAuthClient } from "./oauth";
import { gaEnv } from "./env";

const BASE_URL = "https://analyticsdata.googleapis.com/v1beta";

export interface GaReportRequest {
  dimensions: string[];
  metrics: string[];
  dateRanges: { startDate: string; endDate: string }[];
}

function toApiRequestBody(req: GaReportRequest) {
  return {
    dateRanges: req.dateRanges,
    dimensions: req.dimensions.map((name) => ({ name })),
    metrics: req.metrics.map((name) => ({ name })),
  };
}

export async function runReport(req: GaReportRequest): Promise<unknown> {
  const client = getAuthClient();
  const res = await client.request({
    url: `${BASE_URL}/properties/${gaEnv.propertyId}:runReport`,
    method: "POST",
    data: toApiRequestBody(req),
  });
  return res.data;
}

// Combines multiple report shapes into one round trip against the GA4 API
// quota instead of firing a separate runReport per table.
export async function batchRunReports(requests: GaReportRequest[]): Promise<unknown> {
  const client = getAuthClient();
  const res = await client.request({
    url: `${BASE_URL}/properties/${gaEnv.propertyId}:batchRunReports`,
    method: "POST",
    data: { requests: requests.map(toApiRequestBody) },
  });
  return res.data;
}
