import type { youtubeAnalytics_v2 } from "googleapis";

export const getRetentionDaily = (
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
      metrics: "averageViewDuration,averageViewPercentage,views",
      dimensions: "day",
      sort: "day",
    })
    .catch((e) => {
      console.error("Analytics Error (Retention Daily):", e.message);
      return null;
    });
