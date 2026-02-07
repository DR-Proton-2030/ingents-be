import type { youtubeAnalytics_v2 } from "googleapis";

export const getTrafficSources = (
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
      dimensions: "insightTrafficSourceType",
      sort: "-views",
    })
    .catch((e) => {
      console.error("Analytics Error (Traffic Sources):", e.message);
      return null;
    });

export const getTrafficSourcesDetailSearch = (
  analytics: youtubeAnalytics_v2.Youtubeanalytics,
  channelId: string,
  startDate: string,
  endDate: string,
  maxResults = 15,
) =>
  analytics.reports
    .query({
      ids: `channel==${channelId}`,
      startDate,
      endDate,
      metrics: "views,estimatedMinutesWatched",
      dimensions: "insightTrafficSourceDetail",
      filters: "insightTrafficSourceType==YT_SEARCH",
      sort: "-views",
      maxResults,
    })
    .catch((e) => {
      console.error("Analytics Error (Search Terms):", e.message);
      return null;
    });

export const getTrafficSourcesDetailExternal = (
  analytics: youtubeAnalytics_v2.Youtubeanalytics,
  channelId: string,
  startDate: string,
  endDate: string,
  maxResults = 15,
) =>
  analytics.reports
    .query({
      ids: `channel==${channelId}`,
      startDate,
      endDate,
      metrics: "views,estimatedMinutesWatched",
      dimensions: "insightTrafficSourceDetail",
      filters: "insightTrafficSourceType==EXT_URL",
      sort: "-views",
      maxResults,
    })
    .catch((e) => {
      console.error("Analytics Error (External Sites):", e.message);
      return null;
    });
