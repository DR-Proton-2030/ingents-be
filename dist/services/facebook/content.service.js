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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sumPostEngagement = exports.getTopContent = exports.fetchVideosInWindow = exports.fetchPostsInWindow = void 0;
const axios_1 = __importDefault(require("axios"));
const page_1 = require("./page");
const videoInsights_1 = require("./insights/videoInsights");
const FACEBOOK_GRAPH_URL = "https://graph.facebook.com/v20.0";
function fetchPostsInWindow(pageId_1, accessToken_1, window_1) {
    return __awaiter(this, arguments, void 0, function* (pageId, accessToken, window, limit = 50) {
        var _a;
        // Extend fields to include engagement summaries (supported)
        const url = `${FACEBOOK_GRAPH_URL}/${pageId}/posts`;
        const fields = [
            "id",
            "created_time",
            "message",
            "permalink_url",
            "full_picture",
            "type",
            "reactions.summary(true)",
            "shares",
            "comments.summary(true)",
        ].join(",");
        try {
            const resp = yield axios_1.default.get(url, {
                params: {
                    since: window.sinceISO,
                    until: window.untilISO,
                    limit,
                    fields,
                },
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            return ((_a = resp.data) === null || _a === void 0 ? void 0 : _a.data) || [];
        }
        catch (_) {
            return [];
        }
    });
}
exports.fetchPostsInWindow = fetchPostsInWindow;
function fetchVideosInWindow(pageId_1, accessToken_1, window_1) {
    return __awaiter(this, arguments, void 0, function* (pageId, accessToken, window, limit = 100) {
        return (0, page_1.getRecentVideos)(pageId, accessToken, window.sinceISO, window.untilISO, limit);
    });
}
exports.fetchVideosInWindow = fetchVideosInWindow;
// Build top content from videos ranked by views and view time
function getTopContent(videos_1, accessToken_1) {
    return __awaiter(this, arguments, void 0, function* (videos, accessToken, maxItems = 5) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        const items = [];
        for (const v of videos) {
            const insights = yield (0, videoInsights_1.getVideoInsights)(v.id, accessToken, [
                "total_video_views",
                "total_video_view_time",
            ]);
            const views = ((_c = (_b = (_a = insights.find((i) => i.name === "total_video_views")) === null || _a === void 0 ? void 0 : _a.values) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.value) || 0;
            const viewTime = ((_f = (_e = (_d = insights.find((i) => i.name === "total_video_view_time")) === null || _d === void 0 ? void 0 : _d.values) === null || _e === void 0 ? void 0 : _e[0]) === null || _f === void 0 ? void 0 : _f.value) || 0;
            items.push({
                id: v.id,
                title: v.title || v.description || "",
                thumbnail: (_j = (_h = (_g = v.thumbnails) === null || _g === void 0 ? void 0 : _g.data) === null || _h === void 0 ? void 0 : _h[0]) === null || _j === void 0 ? void 0 : _j.uri,
                created_time: v.created_time,
                views,
                viewTime,
                permalink_url: v.permalink_url,
            });
        }
        items.sort((a, b) => b.views === a.views
            ? (b.viewTime || 0) - (a.viewTime || 0)
            : b.views - a.views);
        return items.slice(0, maxItems);
    });
}
exports.getTopContent = getTopContent;
function sumPostEngagement(posts) {
    var _a, _b, _c, _d, _e;
    let reactions = 0;
    let comments = 0;
    let shares = 0;
    for (const p of posts) {
        reactions += ((_b = (_a = p.reactions) === null || _a === void 0 ? void 0 : _a.summary) === null || _b === void 0 ? void 0 : _b.total_count) || 0;
        comments += ((_d = (_c = p.comments) === null || _c === void 0 ? void 0 : _c.summary) === null || _d === void 0 ? void 0 : _d.total_count) || 0;
        shares += ((_e = p.shares) === null || _e === void 0 ? void 0 : _e.count) || 0;
    }
    return { reactions, comments, shares, total: reactions + comments + shares };
}
exports.sumPostEngagement = sumPostEngagement;
