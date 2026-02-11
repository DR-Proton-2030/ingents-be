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
exports.buildFacebookDashboard = void 0;
const pageInsights_1 = require("./insights/pageInsights");
const videoInsights_1 = require("./insights/videoInsights");
const page_1 = require("./page");
function isoDateDaysAgo(days) {
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
}
function buildFacebookDashboard(pageId, accessToken) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z;
        const last48h = {
            sinceISO: isoDateDaysAgo(2),
            untilISO: new Date().toISOString().split("T")[0],
        };
        const last28d = {
            sinceISO: isoDateDaysAgo(28),
            untilISO: new Date().toISOString().split("T")[0],
        };
        // Fetch page details for header
        const page = yield (0, page_1.getPageDetails)(pageId, accessToken);
        // 1) Top Content (last 48 hours) — rank by video views and view time when available
        const recentVideos48h = yield (0, page_1.getRecentVideos)(pageId, accessToken, last48h.sinceISO, last48h.untilISO, 50);
        const topContent48h = [];
        for (const v of recentVideos48h) {
            const insights = yield (0, videoInsights_1.getVideoInsights)(v.id, accessToken, [
                // Official metrics available on video assets; some pages may lack them
                "total_video_views",
                "total_video_view_time",
            ]);
            const views = ((_c = (_b = (_a = insights.find((i) => i.name === "total_video_views")) === null || _a === void 0 ? void 0 : _a.values) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.value) || 0;
            const viewTime = ((_f = (_e = (_d = insights.find((i) => i.name === "total_video_view_time")) === null || _d === void 0 ? void 0 : _d.values) === null || _e === void 0 ? void 0 : _e[0]) === null || _f === void 0 ? void 0 : _f.value) || 0;
            topContent48h.push({
                id: v.id,
                title: v.title || v.description || "",
                thumbnail: (_j = (_h = (_g = v.thumbnails) === null || _g === void 0 ? void 0 : _g.data) === null || _h === void 0 ? void 0 : _h[0]) === null || _j === void 0 ? void 0 : _j.uri,
                created_time: v.created_time,
                views,
                viewTime,
                permalink_url: v.permalink_url,
            });
        }
        topContent48h.sort((a, b) => {
            if (b.views === a.views)
                return (b.viewTime || 0) - (a.viewTime || 0);
            return b.views - a.views;
        });
        const topContent48hLimited = topContent48h.slice(0, 5);
        // 2) Overview (last 28 days)
        // Totals: video views, watch time, followers gained/lost (net), top content
        const recentVideos28d = yield (0, page_1.getRecentVideos)(pageId, accessToken, last28d.sinceISO, last28d.untilISO, 100);
        let totalViews28d = 0;
        let totalWatchTime28d = 0;
        const videoInsightsCache = {};
        for (const v of recentVideos28d) {
            const ins = yield (0, videoInsights_1.getVideoInsights)(v.id, accessToken, [
                "total_video_views",
                "total_video_view_time",
            ]);
            videoInsightsCache[v.id] = ins;
            totalViews28d +=
                ((_m = (_l = (_k = ins.find((i) => i.name === "total_video_views")) === null || _k === void 0 ? void 0 : _k.values) === null || _l === void 0 ? void 0 : _l[0]) === null || _m === void 0 ? void 0 : _m.value) || 0;
            totalWatchTime28d +=
                ((_q = (_p = (_o = ins.find((i) => i.name === "total_video_view_time")) === null || _o === void 0 ? void 0 : _o.values) === null || _p === void 0 ? void 0 : _p[0]) === null || _q === void 0 ? void 0 : _q.value) || 0;
        }
        const fanAddsRemoves = yield (0, pageInsights_1.getPageInsights)(pageId, accessToken, ["page_fan_adds", "page_fan_removes"], last28d.sinceISO, last28d.untilISO, "day");
        const adds = ((_r = fanAddsRemoves.find((i) => i.name === "page_fan_adds")) === null || _r === void 0 ? void 0 : _r.values) || [];
        const removes = ((_s = fanAddsRemoves.find((i) => i.name === "page_fan_removes")) === null || _s === void 0 ? void 0 : _s.values) || [];
        const followersGained = adds.reduce((sum, r) => sum + (Number(r.value) || 0), 0);
        const followersLost = removes.reduce((sum, r) => sum + (Number(r.value) || 0), 0);
        const netFollowers = followersGained - followersLost;
        const topContent28d = recentVideos28d
            .map((v) => {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j;
            const ins = videoInsightsCache[v.id] || [];
            const views = ((_c = (_b = (_a = ins.find((i) => i.name === "total_video_views")) === null || _a === void 0 ? void 0 : _a.values) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.value) || 0;
            const viewTime = ((_f = (_e = (_d = ins.find((i) => i.name === "total_video_view_time")) === null || _d === void 0 ? void 0 : _d.values) === null || _e === void 0 ? void 0 : _e[0]) === null || _f === void 0 ? void 0 : _f.value) || 0;
            return {
                id: v.id,
                title: v.title || v.description || "",
                thumbnail: (_j = (_h = (_g = v.thumbnails) === null || _g === void 0 ? void 0 : _g.data) === null || _h === void 0 ? void 0 : _h[0]) === null || _j === void 0 ? void 0 : _j.uri,
                created_time: v.created_time,
                views,
                viewTime,
                permalink_url: v.permalink_url,
            };
        })
            .sort((a, b) => b.views === a.views
            ? (b.viewTime || 0) - (a.viewTime || 0)
            : b.views - a.views)
            .slice(0, 5);
        // 3) Content Tab
        const publishedPosts28d = yield (0, page_1.getRecentPosts)(pageId, accessToken, last28d.sinceISO, last28d.untilISO, 50);
        const contentTab = {
            totalViews: totalViews28d, // proxy overall video views
            publishedContent: [
                // Merge videos and posts; videos carry views, posts carry basic metadata
                ...recentVideos28d.map((v) => {
                    var _a, _b, _c;
                    return ({
                        id: v.id,
                        type: "video",
                        title: v.title || v.description || "",
                        permalink_url: v.permalink_url,
                        created_time: v.created_time,
                        thumbnail: (_c = (_b = (_a = v.thumbnails) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.uri,
                    });
                }),
                ...publishedPosts28d.map((p) => ({
                    id: p.id,
                    type: p.type || "post",
                    title: p.message || "",
                    permalink_url: p.permalink_url,
                    created_time: p.created_time,
                    thumbnail: p.full_picture,
                })),
            ],
            // Meta does not provide "new vs returning viewers" segmentation like YouTube
            viewerTypeUnavailable: true,
            viewerTypes: [],
        };
        // 4) Content Performance (Impressions Flow)
        // Meta does not provide CTR-to-watch-time attribution; set zeros and flag unavailability
        const pagePostsImpressions = yield (0, pageInsights_1.getPageInsights)(pageId, accessToken, ["page_posts_impressions"], last28d.sinceISO, last28d.untilISO, "day");
        const impressionsTotal = (((_t = pagePostsImpressions[0]) === null || _t === void 0 ? void 0 : _t.values) || []).reduce((sum, r) => sum + (Number(r.value) || 0), 0);
        const contentPerformance = {
            impressions: impressionsTotal || 0,
            ctr: 0,
            watchTimeFromImpressions: 0,
            impressionsFlowUnavailable: true,
        };
        // 5) Traffic Sources — not exposed by Meta for Pages
        const trafficSources = {
            sources: [],
            trafficSourcesUnavailable: true,
        };
        // 6) Audience Tab (last 28 days)
        // Attempt to split views by followers vs non-followers if metrics exist; otherwise mark as unavailable.
        let followerViews = 0;
        let nonFollowerViews = 0;
        for (const v of recentVideos28d) {
            const ins = yield (0, videoInsights_1.getVideoInsights)(v.id, accessToken, [
                // These may be unavailable depending on page/app
                "total_video_views_follower",
                "total_video_views_non_follower",
            ]);
            followerViews +=
                ((_w = (_v = (_u = ins.find((i) => i.name === "total_video_views_follower")) === null || _u === void 0 ? void 0 : _u.values) === null || _v === void 0 ? void 0 : _v[0]) === null || _w === void 0 ? void 0 : _w.value) || 0;
            nonFollowerViews +=
                ((_z = (_y = (_x = ins.find((i) => i.name === "total_video_views_non_follower")) === null || _x === void 0 ? void 0 : _x.values) === null || _y === void 0 ? void 0 : _y[0]) === null || _z === void 0 ? void 0 : _z.value) || 0;
        }
        const audience = {
            totalViews: totalViews28d,
            followers: (page === null || page === void 0 ? void 0 : page.fan_count) || 0,
            watchTimeSplitUnavailable: !(followerViews || nonFollowerViews),
            watchTimeSplit: [
                { label: "Followers", value: followerViews },
                { label: "Non-followers", value: nonFollowerViews },
            ],
        };
        return {
            page: page || {},
            topContent48h: topContent48hLimited,
            overview28d: {
                views: totalViews28d,
                watchTime: totalWatchTime28d,
                followersGained,
                followersLost,
                netFollowers,
                topContent: topContent28d,
            },
            contentTab,
            contentPerformance,
            trafficSources,
            audience,
        };
    });
}
exports.buildFacebookDashboard = buildFacebookDashboard;
