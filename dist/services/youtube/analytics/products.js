"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProducts = void 0;
const getProducts = (analytics, channelId, startDate, endDate) => analytics.reports
    .query({
    ids: `channel==${channelId}`,
    startDate,
    endDate,
    metrics: "views,estimatedMinutesWatched",
    dimensions: "insightPlaybackLocationType",
    sort: "-views",
})
    .catch((e) => {
    console.error("Analytics Error (Products):", e.message);
    return null;
});
exports.getProducts = getProducts;
