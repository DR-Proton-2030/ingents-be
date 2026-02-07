import type { youtubeAnalytics_v2 } from "googleapis";

export const getTopCountries = (
  analytics: youtubeAnalytics_v2.Youtubeanalytics,
  channelId: string,
  startDate: string,
  endDate: string,
  maxResults = 5,
) =>
  analytics.reports
    .query({
      ids: `channel==${channelId}`,
      startDate,
      endDate,
      metrics: "views,estimatedMinutesWatched,averageViewDuration",
      dimensions: "country",
      sort: "-views",
      maxResults,
    })
    .catch((e) => {
      console.error("Analytics Error (Locations):", e.message);
      return null;
    });

export const getProvincesUS = (
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
      metrics: "views,estimatedMinutesWatched,averageViewDuration",
      dimensions: "province",
      filters: "country==US",
      sort: "-views",
      maxResults,
    })
    .catch((e) => {
      console.error("Analytics Error (Provinces US):", e.message);
      return null;
    });

export const getProvincesCAEmpty = async () =>
  Promise.resolve({ data: { rows: [] } } as any);
