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
exports.fetchContentMetrics = exports.fetchXContentMetrics = exports.fetchInstagramContentMetrics = exports.fetchFacebookContentMetrics = exports.fetchYouTubeContentMetrics = void 0;
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const defaultMetrics = {
    views: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    impressions: 0,
    reach: 0,
    watch_time_minutes: 0,
    avg_view_duration: 0,
    saves: 0,
    retweets: 0,
    quotes: 0,
    bookmarks: 0,
};
/**
 * Fetch metrics for a YouTube video
 */
const fetchYouTubeContentMetrics = (videoId, accessToken) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { data } = yield axios_1.default.get("https://www.googleapis.com/youtube/v3/videos", {
            params: {
                part: "statistics",
                id: videoId,
                access_token: accessToken,
            },
        });
        const stats = (_b = (_a = data.items) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.statistics;
        if (!stats)
            return Object.assign({}, defaultMetrics);
        return Object.assign(Object.assign({}, defaultMetrics), { views: parseInt(stats.viewCount || "0", 10), likes: parseInt(stats.likeCount || "0", 10), comments: parseInt(stats.commentCount || "0", 10), shares: 0 });
    }
    catch (error) {
        console.error(`[MetricsFetcher] YouTube error for ${videoId}:`, error.message);
        return Object.assign({}, defaultMetrics);
    }
});
exports.fetchYouTubeContentMetrics = fetchYouTubeContentMetrics;
/**
 * Fetch metrics for a Facebook post
 */
const fetchFacebookContentMetrics = (postId, pageAccessToken) => __awaiter(void 0, void 0, void 0, function* () {
    var _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
    try {
        const { data } = yield axios_1.default.get(`https://graph.facebook.com/v20.0/${postId}`, {
            params: {
                fields: "likes.summary(true),comments.summary(true),shares",
                access_token: pageAccessToken,
            },
        });
        const likes = ((_d = (_c = data.likes) === null || _c === void 0 ? void 0 : _c.summary) === null || _d === void 0 ? void 0 : _d.total_count) || 0;
        const comments = ((_f = (_e = data.comments) === null || _e === void 0 ? void 0 : _e.summary) === null || _f === void 0 ? void 0 : _f.total_count) || 0;
        const shares = ((_g = data.shares) === null || _g === void 0 ? void 0 : _g.count) || 0;
        // Try to fetch post insights for impressions/reach
        let impressions = 0;
        let reach = 0;
        try {
            const insightsRes = yield axios_1.default.get(`https://graph.facebook.com/v20.0/${postId}/insights`, {
                params: {
                    metric: "post_impressions,post_impressions_unique",
                    access_token: pageAccessToken,
                },
            });
            const insightsData = ((_h = insightsRes.data) === null || _h === void 0 ? void 0 : _h.data) || [];
            for (const metric of insightsData) {
                if (metric.name === "post_impressions") {
                    impressions = ((_k = (_j = metric.values) === null || _j === void 0 ? void 0 : _j[0]) === null || _k === void 0 ? void 0 : _k.value) || 0;
                }
                if (metric.name === "post_impressions_unique") {
                    reach = ((_m = (_l = metric.values) === null || _l === void 0 ? void 0 : _l[0]) === null || _m === void 0 ? void 0 : _m.value) || 0;
                }
            }
        }
        catch (_o) {
            // Insights may not be available for all post types
        }
        return Object.assign(Object.assign({}, defaultMetrics), { likes,
            comments,
            shares,
            impressions,
            reach });
    }
    catch (error) {
        console.error(`[MetricsFetcher] Facebook error for ${postId}:`, error.message);
        return Object.assign({}, defaultMetrics);
    }
});
exports.fetchFacebookContentMetrics = fetchFacebookContentMetrics;
/**
 * Fetch metrics for an Instagram media post
 */
const fetchInstagramContentMetrics = (mediaId, accessToken) => __awaiter(void 0, void 0, void 0, function* () {
    var _p, _q, _r, _s, _t, _u, _v, _w;
    try {
        // Basic media fields
        const { data: mediaData } = yield axios_1.default.get(`https://graph.instagram.com/${mediaId}`, {
            params: {
                fields: "like_count,comments_count",
                access_token: accessToken,
            },
        });
        const likes = mediaData.like_count || 0;
        const comments = mediaData.comments_count || 0;
        // Try insights (requires business/creator account)
        let impressions = 0;
        let reach = 0;
        let saves = 0;
        let shares = 0;
        try {
            const { data: insightsData } = yield axios_1.default.get(`https://graph.instagram.com/${mediaId}/insights`, {
                params: {
                    metric: "impressions,reach,saved,shares",
                    access_token: accessToken,
                },
            });
            for (const metric of insightsData.data || []) {
                if (metric.name === "impressions")
                    impressions = ((_q = (_p = metric.values) === null || _p === void 0 ? void 0 : _p[0]) === null || _q === void 0 ? void 0 : _q.value) || 0;
                if (metric.name === "reach")
                    reach = ((_s = (_r = metric.values) === null || _r === void 0 ? void 0 : _r[0]) === null || _s === void 0 ? void 0 : _s.value) || 0;
                if (metric.name === "saved")
                    saves = ((_u = (_t = metric.values) === null || _t === void 0 ? void 0 : _t[0]) === null || _u === void 0 ? void 0 : _u.value) || 0;
                if (metric.name === "shares")
                    shares = ((_w = (_v = metric.values) === null || _v === void 0 ? void 0 : _v[0]) === null || _w === void 0 ? void 0 : _w.value) || 0;
            }
        }
        catch (_x) {
            // Insights may not be available
        }
        return Object.assign(Object.assign({}, defaultMetrics), { likes,
            comments,
            shares,
            impressions,
            reach,
            saves });
    }
    catch (error) {
        console.error(`[MetricsFetcher] Instagram error for ${mediaId}:`, error.message);
        return Object.assign({}, defaultMetrics);
    }
});
exports.fetchInstagramContentMetrics = fetchInstagramContentMetrics;
/**
 * Fetch metrics for an X (Twitter) tweet
 */
const fetchXContentMetrics = (tweetId, accessToken) => __awaiter(void 0, void 0, void 0, function* () {
    var _y;
    try {
        const { data } = yield axios_1.default.get(`https://api.twitter.com/2/tweets/${tweetId}`, {
            params: {
                "tweet.fields": "public_metrics",
            },
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });
        const metrics = (_y = data.data) === null || _y === void 0 ? void 0 : _y.public_metrics;
        if (!metrics)
            return Object.assign({}, defaultMetrics);
        return Object.assign(Object.assign({}, defaultMetrics), { views: metrics.impression_count || 0, likes: metrics.like_count || 0, comments: metrics.reply_count || 0, retweets: metrics.retweet_count || 0, quotes: metrics.quote_count || 0, bookmarks: metrics.bookmark_count || 0, impressions: metrics.impression_count || 0 });
    }
    catch (error) {
        console.error(`[MetricsFetcher] X error for ${tweetId}:`, error.message);
        return Object.assign({}, defaultMetrics);
    }
});
exports.fetchXContentMetrics = fetchXContentMetrics;
/**
 * Fetch content metrics for any platform
 */
const fetchContentMetrics = (platform, platformPostId, accessToken) => __awaiter(void 0, void 0, void 0, function* () {
    switch (platform) {
        case "youtube":
            return (0, exports.fetchYouTubeContentMetrics)(platformPostId, accessToken);
        case "facebook":
            return (0, exports.fetchFacebookContentMetrics)(platformPostId, accessToken);
        case "instagram":
            return (0, exports.fetchInstagramContentMetrics)(platformPostId, accessToken);
        case "x":
            return (0, exports.fetchXContentMetrics)(platformPostId, accessToken);
        default:
            console.warn(`[MetricsFetcher] Unknown platform: ${platform}`);
            return Object.assign({}, defaultMetrics);
    }
});
exports.fetchContentMetrics = fetchContentMetrics;
