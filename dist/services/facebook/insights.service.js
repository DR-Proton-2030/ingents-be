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
exports.getViewsOverTimeDaily = exports.getFollowersDelta = exports.getTotalsForWindow = void 0;
const pageInsights_1 = require("./insights/pageInsights");
const videoInsights_1 = require("./insights/videoInsights");
function getTotalsForWindow(pageId, accessToken, videoIds) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
        let views = 0;
        let watchTime = 0;
        let views3s = 0;
        let views1m = 0;
        let threeSecondViewsUnavailable = true;
        let oneMinuteViewsUnavailable = true;
        // Aggregate across videos using official metrics where available
        for (const vid of videoIds) {
            const ins = yield (0, videoInsights_1.getVideoInsights)(vid, accessToken, [
                "total_video_views",
                "total_video_view_time",
                // 3s and 60s views may not be available on all pages/apps; handled gracefully
                "total_video_3s_views",
                "total_video_60s_views",
            ]);
            views +=
                ((_c = (_b = (_a = ins.find((i) => i.name === "total_video_views")) === null || _a === void 0 ? void 0 : _a.values) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.value) || 0;
            watchTime +=
                ((_f = (_e = (_d = ins.find((i) => i.name === "total_video_view_time")) === null || _d === void 0 ? void 0 : _d.values) === null || _e === void 0 ? void 0 : _e[0]) === null || _f === void 0 ? void 0 : _f.value) ||
                    0;
            const v3 = (_j = (_h = (_g = ins.find((i) => i.name === "total_video_3s_views")) === null || _g === void 0 ? void 0 : _g.values) === null || _h === void 0 ? void 0 : _h[0]) === null || _j === void 0 ? void 0 : _j.value;
            const v60 = (_m = (_l = (_k = ins.find((i) => i.name === "total_video_60s_views")) === null || _k === void 0 ? void 0 : _k.values) === null || _l === void 0 ? void 0 : _l[0]) === null || _m === void 0 ? void 0 : _m.value;
            if (typeof v3 === "number") {
                views3s += v3;
                threeSecondViewsUnavailable = false;
            }
            if (typeof v60 === "number") {
                views1m += v60;
                oneMinuteViewsUnavailable = false;
            }
        }
        return {
            views,
            watchTime,
            views3s,
            views1m,
            threeSecondViewsUnavailable,
            oneMinuteViewsUnavailable,
        };
    });
}
exports.getTotalsForWindow = getTotalsForWindow;
function getFollowersDelta(pageId, accessToken, window) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const fanAddsRemoves = yield (0, pageInsights_1.getPageInsights)(pageId, accessToken, ["page_fan_adds", "page_fan_removes"], window.sinceISO, window.untilISO, "day");
        const adds = ((_a = fanAddsRemoves.find((i) => i.name === "page_fan_adds")) === null || _a === void 0 ? void 0 : _a.values) || [];
        const removes = ((_b = fanAddsRemoves.find((i) => i.name === "page_fan_removes")) === null || _b === void 0 ? void 0 : _b.values) || [];
        const followersGained = adds.reduce((sum, r) => sum + (Number(r.value) || 0), 0);
        const followersLost = removes.reduce((sum, r) => sum + (Number(r.value) || 0), 0);
        const netFollowers = followersGained - followersLost;
        return { followersGained, followersLost, netFollowers };
    });
}
exports.getFollowersDelta = getFollowersDelta;
function getViewsOverTimeDaily(pageId, accessToken, window) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        // Page-level video views over time; if unavailable, return empty
        const insights = yield (0, pageInsights_1.getPageInsights)(pageId, accessToken, ["page_video_views"], window.sinceISO, window.untilISO, "day");
        const values = ((_a = insights[0]) === null || _a === void 0 ? void 0 : _a.values) || [];
        return values.map((v) => ({ date: v.end_time, views: Number(v.value) || 0 }));
    });
}
exports.getViewsOverTimeDaily = getViewsOverTimeDaily;
