"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTrafficSourcesDetailExternal = exports.getTrafficSourcesDetailSearch = exports.getTrafficSources = void 0;
const getTrafficSources = (analytics, channelId, startDate, endDate) => analytics.reports
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
exports.getTrafficSources = getTrafficSources;
const getTrafficSourcesDetailSearch = (analytics, channelId, startDate, endDate, maxResults = 15) => analytics.reports
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
exports.getTrafficSourcesDetailSearch = getTrafficSourcesDetailSearch;
const getTrafficSourcesDetailExternal = (analytics, channelId, startDate, endDate, maxResults = 15) => analytics.reports
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
exports.getTrafficSourcesDetailExternal = getTrafficSourcesDetailExternal;
