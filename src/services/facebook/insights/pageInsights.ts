import axios from "axios";

const FACEBOOK_GRAPH_URL = "https://graph.facebook.com/v20.0"; // v18+ required

export type InsightValue = { end_time?: string; value: any };
export type Insight = { name: string; period: string; values: InsightValue[] };

// Fetch page insights for a given metric list and window. Gracefully returns [] on errors.
export async function getPageInsights(
  pageId: string,
  accessToken: string,
  metrics: string[],
  since?: string,
  until?: string,
  period: "day" | "week" | "days_28" | "lifetime" = "day",
): Promise<Insight[]> {
  try {
    const params: Record<string, string> = {
      metric: metrics.join(","),
      period,
    };
    if (since) params.since = since;
    if (until) params.until = until;
    const url = `${FACEBOOK_GRAPH_URL}/${pageId}/insights`;
    const resp = await axios.get(url, {
      params,
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return (resp.data?.data || []) as Insight[];
  } catch (_) {
    // Some pages or apps won't have certain metrics or permissions.
    // Return empty array to indicate unavailability.
    return [];
  }
}

// Convenience for lifetime metrics
export async function getPageLifetimeInsights(
  pageId: string,
  accessToken: string,
  metrics: string[],
): Promise<Insight[]> {
  return getPageInsights(
    pageId,
    accessToken,
    metrics,
    undefined,
    undefined,
    "lifetime",
  );
}
