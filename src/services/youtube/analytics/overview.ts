import type { youtubeAnalytics_v2 } from "googleapis";

export const getOverview = (
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
      metrics:
        "views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,subscribersGained,subscribersLost",
    })
    .catch((e) => {
      console.error("Analytics Error (Overview):", e.message);
      return null;
    });

export const getGrowth = (
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
      metrics: "views,subscribersGained",
      dimensions: "day",
      sort: "day",
    })
    .catch((e) => {
      console.error("Analytics Error (Growth):", e.message);
      return null;
    });
