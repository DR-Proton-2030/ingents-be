import { getPageInsights, Insight } from "./insights/pageInsights";
import { getVideoInsights } from "./insights/videoInsights";

export type DateWindow = { sinceISO: string; untilISO: string };

export type Totals = {
  views: number;
  watchTime: number;
  views3s: number;
  views1m: number;
  threeSecondViewsUnavailable: boolean;
  oneMinuteViewsUnavailable: boolean;
};

export async function getTotalsForWindow(
  pageId: string,
  accessToken: string,
  videoIds: string[],
): Promise<Totals> {
  let views = 0;
  let watchTime = 0;
  let views3s = 0;
  let views1m = 0;
  let threeSecondViewsUnavailable = true;
  let oneMinuteViewsUnavailable = true;

  // Aggregate across videos using official metrics where available
  for (const vid of videoIds) {
    const ins = await getVideoInsights(vid, accessToken, [
      "total_video_views",
      "total_video_view_time",
      // 3s and 60s views may not be available on all pages/apps; handled gracefully
      "total_video_3s_views",
      "total_video_60s_views",
    ]);
    views +=
      ins.find((i) => i.name === "total_video_views")?.values?.[0]?.value || 0;
    watchTime +=
      ins.find((i) => i.name === "total_video_view_time")?.values?.[0]?.value ||
      0;

    const v3 = ins.find((i) => i.name === "total_video_3s_views")?.values?.[0]
      ?.value;
    const v60 = ins.find((i) => i.name === "total_video_60s_views")?.values?.[0]
      ?.value;
    if (typeof v3 === "number") {
      views3s += v3;
      threeSecondViewsUnavailable = false;
    }
    if (typeof v60 === "number") {
      views1m += v60;
      oneMinuteViewsUnavailable = false;
    }
  }

  return {
    views,
    watchTime,
    views3s,
    views1m,
    threeSecondViewsUnavailable,
    oneMinuteViewsUnavailable,
  };
}

export async function getFollowersDelta(
  pageId: string,
  accessToken: string,
  window: DateWindow,
) {
  const fanAddsRemoves = await getPageInsights(
    pageId,
    accessToken,
    ["page_fan_adds", "page_fan_removes"],
    window.sinceISO,
    window.untilISO,
    "day",
  );
  const adds =
    fanAddsRemoves.find((i) => i.name === "page_fan_adds")?.values || [];
  const removes =
    fanAddsRemoves.find((i) => i.name === "page_fan_removes")?.values || [];
  const followersGained = adds.reduce(
    (sum, r) => sum + (Number(r.value) || 0),
    0,
  );
  const followersLost = removes.reduce(
    (sum, r) => sum + (Number(r.value) || 0),
    0,
  );
  const netFollowers = followersGained - followersLost;
  return { followersGained, followersLost, netFollowers };
}

export async function getViewsOverTimeDaily(
  pageId: string,
  accessToken: string,
  window: DateWindow,
) {
  // Page-level video views over time; if unavailable, return empty
  const insights: Insight[] = await getPageInsights(
    pageId,
    accessToken,
    ["page_video_views"],
    window.sinceISO,
    window.untilISO,
    "day",
  );
  const values = insights[0]?.values || [];
  return values.map((v) => ({ date: v.end_time, views: Number(v.value) || 0 }));
}

export type EngagementTotals = {
  reactions: number;
  comments: number;
  shares: number;
  total: number;
  engagementOverTimeUnavailable: boolean;
};
