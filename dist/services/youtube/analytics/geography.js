"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProvincesCAEmpty = exports.getProvincesUS = exports.getTopCountries = void 0;
const getTopCountries = (analytics, channelId, startDate, endDate, maxResults = 5) => analytics.reports
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
exports.getTopCountries = getTopCountries;
const getProvincesUS = (analytics, channelId, startDate, endDate, maxResults = 10) => analytics.reports
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
exports.getProvincesUS = getProvincesUS;
const getProvincesCAEmpty = () => __awaiter(void 0, void 0, void 0, function* () { return Promise.resolve({ data: { rows: [] } }); });
exports.getProvincesCAEmpty = getProvincesCAEmpty;
