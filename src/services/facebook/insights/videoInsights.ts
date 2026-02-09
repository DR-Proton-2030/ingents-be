import axios from "axios";

const FACEBOOK_GRAPH_URL = "https://graph.facebook.com/v20.0";

export type VideoInsight = {
  name: string;
  period: string;
  values: { value: any }[];
};

// Fetch insights for a specific video asset. Returns [] if metric unavailable.
export async function getVideoInsights(
  videoId: string,
  accessToken: string,
  metrics: string[],
): Promise<VideoInsight[]> {
  try {
    const url = `${FACEBOOK_GRAPH_URL}/${videoId}/insights`;
    const resp = await axios.get(url, {
      params: { metric: metrics.join(",") },
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return (resp.data?.data || []) as VideoInsight[];
  } catch (_) {
    return [];
  }
}
