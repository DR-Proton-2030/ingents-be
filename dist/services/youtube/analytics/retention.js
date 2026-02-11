"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRetentionDaily = void 0;
const getRetentionDaily = (analytics, channelId, startDate, endDate) => analytics.reports
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
exports.getRetentionDaily = getRetentionDaily;
