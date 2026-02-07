import type { youtubeAnalytics_v2 } from "googleapis";

export const getProducts = (
  analytics: youtubeAnalytics_v2.Youtubeanalytics,
  channelId: string,
  startDate: string,
  endDate: string,
) =>
  analytics.reports
    .query({
      ids: `channel==${channelId}`,
      startDate,
      endDate,
      metrics: "views,estimatedMinutesWatched",
      dimensions: "insightPlaybackLocationType",
      sort: "-views",
    })
    .catch((e) => {
      console.error("Analytics Error (Products):", e.message);
      return null;
    });
