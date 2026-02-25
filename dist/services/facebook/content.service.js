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
exports.updateFbAllPostsEngagement = exports.getFbPostAnalytics = exports.sumPostEngagement = exports.getTopContent = exports.fetchVideosInWindow = exports.fetchPostsInWindow = void 0;
const axios_1 = __importDefault(require("axios"));
const page_1 = require("./page");
const videoInsights_1 = require("./insights/videoInsights");
const postedContent_model_1 = __importDefault(require("../../models/postedContent/postedContent.model"));
const facebook_service_1 = require("./facebook.service");
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
function getFbPostAnalytics(pageId, postId, accessToken) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t;
        // Try to use the ID as provided first. 
        // If it doesn't have an underscore, it might be a direct Photo/Video object.
        const targetId = postId;
        try {
            // Get basic info to identify the object or its story ID
            const infoRes = yield axios_1.default.get(`https://graph.facebook.com/v20.0/${targetId}`, {
                params: {
                    fields: "id,page_story_id",
                    access_token: accessToken,
                },
            }).catch((err) => __awaiter(this, void 0, void 0, function* () {
                // If direct ID failed, try prefixing it (standard Post ID format)
                if (!postId.includes("_")) {
                    return yield axios_1.default.get(`https://graph.facebook.com/v20.0/${pageId}_${postId}`, {
                        params: {
                            fields: "id,page_story_id",
                            access_token: accessToken,
                        },
                    });
                }
                throw err;
            }));
            const data = infoRes.data;
            // page_story_id is the actual Post that shows up in the feed for a Photo
            const actualId = data.page_story_id || data.id;
            // Get engagement counts
            let likes = 0;
            let comments = 0;
            let shares = 0;
            try {
                // Try Post-style metrics first (reactions/shares)
                const engagementRes = yield axios_1.default.get(`https://graph.facebook.com/v20.0/${actualId}`, {
                    params: {
                        fields: "shares,reactions.limit(0).summary(true),comments.limit(0).summary(true)",
                        access_token: accessToken,
                    },
                });
                likes = ((_b = (_a = engagementRes.data.reactions) === null || _a === void 0 ? void 0 : _a.summary) === null || _b === void 0 ? void 0 : _b.total_count) || 0;
                comments = ((_d = (_c = engagementRes.data.comments) === null || _c === void 0 ? void 0 : _c.summary) === null || _d === void 0 ? void 0 : _d.total_count) || 0;
                shares = ((_e = engagementRes.data.shares) === null || _e === void 0 ? void 0 : _e.count) || 0;
            }
            catch (e) {
                // Fallback for objects that only support direct 'likes' connection
                try {
                    const engagementRes = yield axios_1.default.get(`https://graph.facebook.com/v20.0/${actualId}`, {
                        params: {
                            fields: "likes.limit(0).summary(true),comments.limit(0).summary(true)",
                            access_token: accessToken,
                        },
                    });
                    likes = ((_g = (_f = engagementRes.data.likes) === null || _f === void 0 ? void 0 : _f.summary) === null || _g === void 0 ? void 0 : _g.total_count) || 0;
                    comments = ((_j = (_h = engagementRes.data.comments) === null || _h === void 0 ? void 0 : _h.summary) === null || _j === void 0 ? void 0 : _j.total_count) || 0;
                }
                catch (innerE) {
                    // Silently fail if engagement cannot be retrieved
                }
            }
            // Get views (insights) - only if it has a post ID format
            let views = 0;
            if (actualId.includes("_")) {
                try {
                    // We try post_impressions as a proxy for views on non-video posts
                    const insightsRes = yield axios_1.default.get(`https://graph.facebook.com/v20.0/${actualId}/insights`, {
                        params: {
                            metric: "post_impressions",
                            access_token: accessToken,
                        },
                    });
                    views = ((_o = (_m = (_l = (_k = insightsRes.data.data) === null || _k === void 0 ? void 0 : _k[0]) === null || _l === void 0 ? void 0 : _l.values) === null || _m === void 0 ? void 0 : _m[0]) === null || _o === void 0 ? void 0 : _o.value) || 0;
                }
                catch (e) {
                    // If impressions fail, try video views if it might be a video
                    try {
                        const insightsRes = yield axios_1.default.get(`https://graph.facebook.com/v20.0/${actualId}/insights`, {
                            params: {
                                metric: "post_video_views",
                                access_token: accessToken,
                            },
                        });
                        views = ((_s = (_r = (_q = (_p = insightsRes.data.data) === null || _p === void 0 ? void 0 : _p[0]) === null || _q === void 0 ? void 0 : _q.values) === null || _r === void 0 ? void 0 : _r[0]) === null || _s === void 0 ? void 0 : _s.value) || 0;
                    }
                    catch (videoE) {
                        // No views available
                    }
                }
            }
            return {
                likes,
                comments,
                shares,
                views,
            };
        }
        catch (err) {
            console.error(`FB Graph API error for ${postId}:`, ((_t = err.response) === null || _t === void 0 ? void 0 : _t.data) || err.message);
            throw err;
        }
    });
}
exports.getFbPostAnalytics = getFbPostAnalytics;
/**
 * Finds all Facebook posts in PostedContentModel for a user,
 * fetches their latest engagement metrics, and updates the database.
 */
function updateFbAllPostsEngagement(userId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const posts = yield postedContent_model_1.default.find({
                user_id: userId,
                platform: "facebook",
                status: "published",
                platform_post_id: { $ne: null },
            });
            if (!posts.length) {
                console.log(`No Facebook posts found for user ${userId}`);
                return;
            }
            // Group posts by page_id to minimize token lookups
            const postsByPage = {};
            posts.forEach((p) => {
                if (p.page_id) {
                    if (!postsByPage[p.page_id])
                        postsByPage[p.page_id] = [];
                    postsByPage[p.page_id].push(p);
                }
            });
            for (const [pageId, pagePosts] of Object.entries(postsByPage)) {
                try {
                    const { pageAccessToken } = yield (0, facebook_service_1.getPageTokenService)(userId, pageId);
                    for (const post of pagePosts) {
                        try {
                            // platform_post_id might be "pageId_postId" or just "postId"
                            let postId = post.platform_post_id;
                            const analytics = yield getFbPostAnalytics(pageId, postId, pageAccessToken);
                            yield postedContent_model_1.default.findByIdAndUpdate(post._id, {
                                $set: {
                                    engagement: {
                                        likes: analytics.likes,
                                        comments: analytics.comments,
                                        shares: analytics.shares,
                                        views: analytics.views,
                                    },
                                },
                            });
                        }
                        catch (postErr) {
                            console.error(`Failed to update engagement for post ${post.platform_post_id}:`, postErr.message);
                        }
                    }
                }
                catch (tokenErr) {
                    console.error(`Failed to get page token for page ${pageId}:`, tokenErr.message);
                }
            }
            console.log(`Successfully updated engagement for ${posts.length} Facebook posts`);
        }
        catch (err) {
            console.error("Error in updateFbAllPostsEngagement:", err);
            throw err;
        }
    });
}
exports.updateFbAllPostsEngagement = updateFbAllPostsEngagement;
