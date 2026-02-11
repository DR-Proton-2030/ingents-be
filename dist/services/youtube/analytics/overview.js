"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGrowth = exports.getOverview = void 0;
const getOverview = (analytics, channelId, startDate, endDate) => analytics.reports
    .query({
    ids: `channel==${channelId}`,
    startDate,
    endDate,
    metrics: "views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,subscribersGained,subscribersLost",
})
    .catch((e) => {
    console.error("Analytics Error (Overview):", e.message);
    return null;
});
exports.getOverview = getOverview;
const getGrowth = (analytics, channelId, startDate, endDate) => analytics.reports
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
exports.getGrowth = getGrowth;
