import type { youtubeAnalytics_v2 } from "googleapis";

export const getReachDaily = (
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
      dimensions: "day",
      sort: "day",
    })
    .catch((e) => {
      console.error("Analytics Error (Reach Daily):", e.message);
      return null;
    });
