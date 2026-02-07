import type { youtubeAnalytics_v2 } from "googleapis";

export const getSubscribedStatus = (
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
      dimensions: "subscribedStatus",
      sort: "-views",
    })
    .catch((e) => {
      console.error("Analytics Error (Subscribed Status):", e.message);
      return null;
    });

export const getAgeReport = (
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
      metrics: "viewerPercentage",
      dimensions: "ageGroup",
      sort: "ageGroup",
    })
    .catch((e) => {
      console.error("Analytics Error (Age):", e.message);
      return null;
    });

export const getGenderReport = (
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
      metrics: "viewerPercentage",
      dimensions: "gender",
      sort: "gender",
    })
    .catch((e) => {
      console.error("Analytics Error (Gender):", e.message);
      return null;
    });

export const getDeviceTypes = (
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
      dimensions: "deviceType",
      sort: "-views",
    })
    .catch((e) => {
      console.error("Analytics Error (Device Types):", e.message);
      return null;
    });

export const getOperatingSystems = (
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
      dimensions: "operatingSystem",
      sort: "-views",
    })
    .catch((e) => {
      console.error("Analytics Error (OS):", e.message);
      return null;
    });
