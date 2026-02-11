"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getReachDaily = void 0;
const getReachDaily = (analytics, channelId, startDate, endDate) => analytics.reports
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
exports.getReachDaily = getReachDaily;
