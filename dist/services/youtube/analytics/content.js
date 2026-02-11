"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTopVideosWithRetention = exports.getTopContent = void 0;
const getTopContent = (analytics, channelId, startDate, endDate, maxResults = 10) => analytics.reports
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
exports.getTopContent = getTopContent;
const getTopVideosWithRetention = (analytics, channelId, startDate, endDate, maxResults = 10) => analytics.reports
    .query({
    ids: `channel==${channelId}`,
    startDate,
    endDate,
    metrics: "views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage",
    dimensions: "video",
    sort: "-views",
    maxResults,
})
    .catch((e) => {
    console.error("Analytics Error (Top Videos):", e.message);
    return null;
});
exports.getTopVideosWithRetention = getTopVideosWithRetention;
