"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOperatingSystems = exports.getDeviceTypes = exports.getGenderReport = exports.getAgeReport = exports.getSubscribedStatus = void 0;
const getSubscribedStatus = (analytics, channelId, startDate, endDate) => analytics.reports
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
exports.getSubscribedStatus = getSubscribedStatus;
const getAgeReport = (analytics, channelId, startDate, endDate) => analytics.reports
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
exports.getAgeReport = getAgeReport;
const getGenderReport = (analytics, channelId, startDate, endDate) => analytics.reports
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
exports.getGenderReport = getGenderReport;
const getDeviceTypes = (analytics, channelId, startDate, endDate) => analytics.reports
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
exports.getDeviceTypes = getDeviceTypes;
const getOperatingSystems = (analytics, channelId, startDate, endDate) => analytics.reports
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
exports.getOperatingSystems = getOperatingSystems;
