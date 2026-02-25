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
exports.updateInstagramAllPostsEngagement = exports.getIgPostAnalytics = void 0;
const axios_1 = __importDefault(require("axios"));
const postedContent_model_1 = __importDefault(require("../../models/postedContent/postedContent.model"));
const users_model_1 = __importDefault(require("../../models/users/users.model"));
function getIgPostAnalytics(mediaId, accessToken) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        try {
            let likes = 0;
            let comments = 0;
            let shares = 0;
            let views = 0;
            const { data: mediaData } = yield axios_1.default.get(`https://graph.instagram.com/${mediaId}`, {
                params: {
                    fields: "like_count,comments_count",
                    access_token: accessToken,
                },
            });
            likes = mediaData.like_count || 0;
            comments = mediaData.comments_count || 0;
            // For views (impressions) and shares
            try {
                const { data: insightsRes } = yield axios_1.default.get(`https://graph.instagram.com/${mediaId}/insights`, {
                    params: {
                        metric: "impressions,reach,shares,plays",
                        access_token: accessToken,
                    },
                });
                if (insightsRes && insightsRes.data) {
                    insightsRes.data.forEach((metric) => {
                        var _a, _b, _c, _d;
                        if (metric.name === "impressions" || metric.name === "plays") {
                            views = Math.max(views, ((_b = (_a = metric.values) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.value) || 0);
                        }
                        if (metric.name === "shares") {
                            shares = ((_d = (_c = metric.values) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.value) || 0;
                        }
                    });
                }
            }
            catch (e) {
                // Not all media types support insights (e.g., standard images might not support 'plays' or 'shares')
                // Or might be deprecated in some graph versions natively, we silently catch.
            }
            return { likes, comments, shares, views };
        }
        catch (err) {
            console.error(`IG Graph API error for ${mediaId}:`, ((_a = err.response) === null || _a === void 0 ? void 0 : _a.data) || err.message);
            throw err;
        }
    });
}
exports.getIgPostAnalytics = getIgPostAnalytics;
/**
 * Finds all Instagram posts in PostedContentModel for a user,
 * fetches their latest engagement metrics, and updates the database.
 */
function updateInstagramAllPostsEngagement(userId) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        try {
            const user = yield users_model_1.default.findById(userId).exec();
            if (!user || !((_a = user.instagram) === null || _a === void 0 ? void 0 : _a.access_token)) {
                console.log(`No Instagram access token for user ${userId}`);
                return;
            }
            const accessToken = user.instagram.access_token;
            const posts = yield postedContent_model_1.default.find({
                user_id: userId,
                platform: "instagram",
                status: "published",
                platform_post_id: { $ne: null },
            });
            if (!posts.length) {
                console.log(`No Instagram posts found for user ${userId}`);
                return;
            }
            for (const post of posts) {
                try {
                    const postId = post.platform_post_id;
                    const analytics = yield getIgPostAnalytics(postId, accessToken);
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
                    console.error(`Failed to update engagement for IG post ${post.platform_post_id}:`, postErr.message);
                }
            }
            console.log(`Successfully updated engagement for ${posts.length} Instagram posts`);
        }
        catch (err) {
            console.error("Error in updateInstagramAllPostsEngagement:", err);
            throw err;
        }
    });
}
exports.updateInstagramAllPostsEngagement = updateInstagramAllPostsEngagement;
