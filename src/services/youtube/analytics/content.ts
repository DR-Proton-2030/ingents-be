import type { youtubeAnalytics_v2 } from "googleapis";

export const getTopContent = (
  analytics: youtubeAnalytics_v2.Youtubeanalytics,
  channelId: string,
  startDate: string,
  endDate: string,
  maxResults = 10,
) =>
  analytics.reports
    .query({
      ids: `channel==${channelId}`,
      startDate,
      endDate,
      metrics: "views,estimatedMinutesWatched",
      dimensions: "video",
      sort: "-views",
      maxResults,
    })
    .catch((e) => {
      console.error("Analytics Error (Top Content):", e.message);
      return null;
    });

export const getTopVideosWithRetention = (
  analytics: youtubeAnalytics_v2.Youtubeanalytics,
  channelId: string,
  startDate: string,
  endDate: string,
  maxResults = 10,
) =>
  analytics.reports
    .query({
      ids: `channel==${channelId}`,
      startDate,
      endDate,
      metrics:
        "views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage",
      dimensions: "video",
      sort: "-views",
      maxResults,
    })
    .catch((e) => {
      console.error("Analytics Error (Top Videos):", e.message);
      return null;
    });
