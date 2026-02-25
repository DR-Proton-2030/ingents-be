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
exports.buildInstagramDashboardBuilder = void 0;
const axios_1 = __importDefault(require("axios"));
function buildInstagramDashboardBuilder(igUserId, accessToken) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        // 1. Fetch Profile (Overview & Audience data)
        const profileParams = {
            fields: "id,username,name,account_type,profile_picture_url,followers_count,follows_count,media_count",
            access_token: accessToken,
        };
        const profileUrl = `https://graph.instagram.com/me`; // Can also use v18.0/${igUserId}
        let profileData = {};
        try {
            const { data } = yield axios_1.default.get(profileUrl, { params: profileParams });
            profileData = data;
        }
        catch (err) {
            console.error("Failed to fetch IG Profile for dashboard:", err);
        }
        // 2. Fetch Media Content (Posts)
        const mediaParams = {
            fields: "id,media_type,media_url,permalink,timestamp,caption,like_count,comments_count,children{media_url,media_type}",
            access_token: accessToken,
            limit: 50, // Get recent 50 posts
        };
        const mediaUrl = `https://graph.instagram.com/me/media`; // Can also use v18.0/${igUserId}/media
        let publishedContent = [];
        try {
            const { data } = yield axios_1.default.get(mediaUrl, { params: mediaParams });
            publishedContent = (data.data || []).map((post) => {
                var _a;
                let mediaUrls = [];
                if (post.media_type === "CAROUSEL_ALBUM" && ((_a = post.children) === null || _a === void 0 ? void 0 : _a.data)) {
                    mediaUrls = post.children.data
                        .map((child) => child.media_url)
                        .filter(Boolean);
                }
                else if (post.media_url) {
                    mediaUrls.push(post.media_url);
                }
                return Object.assign(Object.assign({}, post), { media_urls: mediaUrls });
            });
        }
        catch (err) {
            console.error("Failed to fetch IG Media for dashboard:", err);
        }
        // 3. Prepare Insights Data Structure
        let insightsData = {
            views: {
                total: 0,
                followersPercentage: 0,
                nonFollowersPercentage: 0,
            },
            accountsReached: 0,
            reachByContentType: {
                posts: 0,
                stories: 0,
                reels: 0,
            },
            interactions: {
                total: 0,
                followersPercentage: 0,
                nonFollowersPercentage: 0,
            },
            interactionsByContentType: {
                posts: 0,
                reels: 0,
                stories: 0,
            },
            profileActivity: {
                profileVisits: 0,
                externalLinkTaps: 0,
            },
            responsiveness: {
                dailyResponseRate: "--",
                dailyResponseTime: "--",
            },
            conversations: {
                messagingConversationsStarted: 0,
                totalMessagingContacts: 0,
                newMessagingContacts: 0,
                returningMessagingContacts: 0,
            },
            topContentByViews: [],
            topContentByInteractions: [],
        };
        try {
            let totalInteractions = 0;
            let postsInteractions = 0;
            let reelsInteractions = 0;
            let postsCount = 0;
            let reelsCount = 0;
            const sortedByInteractions = [...publishedContent].sort((a, b) => {
                const aInteractions = (a.like_count || 0) + (a.comments_count || 0);
                const bInteractions = (b.like_count || 0) + (b.comments_count || 0);
                return bInteractions - aInteractions;
            });
            sortedByInteractions.forEach(post => {
                const interactions = (post.like_count || 0) + (post.comments_count || 0);
                totalInteractions += interactions;
                // Determine if Reel or Post
                // In IG Graph API: VIDEO is usually a Reel/Video, IMAGE/CAROUSEL_ALBUM is a Post
                if (post.media_type === "VIDEO") {
                    reelsInteractions += interactions;
                    reelsCount++;
                }
                else {
                    postsInteractions += interactions;
                    postsCount++;
                }
            });
            // Populate interactions data
            insightsData.interactions.total = totalInteractions;
            // Calculate percentages for content type (avoiding division by zero)
            if (totalInteractions > 0) {
                insightsData.interactionsByContentType.posts = Number(((postsInteractions / totalInteractions) * 100).toFixed(1));
                insightsData.interactionsByContentType.reels = Number(((reelsInteractions / totalInteractions) * 100).toFixed(1));
            }
            // Set reach defaults based on content count as a fallback
            if (publishedContent.length > 0) {
                const totalContent = postsCount + reelsCount;
                insightsData.reachByContentType.posts = Number(((postsCount / totalContent) * 100).toFixed(1));
                insightsData.reachByContentType.reels = Number(((reelsCount / totalContent) * 100).toFixed(1));
            }
            insightsData.topContentByInteractions = sortedByInteractions.slice(0, 5);
            insightsData.topContentByViews = sortedByInteractions.slice(0, 5);
            // Attempt to fetch 30-day native insights
            const insightsUrl = `https://graph.instagram.com/${igUserId}/insights`;
            const insightsParams = {
                metric: "impressions,reach,profile_views",
                period: "day", // day, week, month, lifetime depending on API version
                access_token: accessToken,
            };
            try {
                const { data: insightsRes } = yield axios_1.default.get(insightsUrl, { params: insightsParams });
                if (insightsRes && insightsRes.data) {
                    let totalReach = 0;
                    let totalViews = 0;
                    let totalProfileVisits = 0;
                    // Sum up the last 30 days if it returns a 'day' array, or just use the immediate value
                    insightsRes.data.forEach((metric) => {
                        let sum = 0;
                        if (Array.isArray(metric.values)) {
                            // Take up to 30 days of values if available
                            metric.values.slice(0, 30).forEach((val) => sum += (val.value || 0));
                        }
                        else {
                            // Fallback if not an array
                            sum = metric.value || 0;
                        }
                        if (metric.name === "reach")
                            totalReach = sum;
                        if (metric.name === "profile_views")
                            totalProfileVisits = sum;
                        if (metric.name === "impressions")
                            totalViews = sum;
                    });
                    if (totalReach > 0)
                        insightsData.accountsReached = totalReach;
                    if (totalProfileVisits > 0)
                        insightsData.profileActivity.profileVisits = totalProfileVisits;
                    if (totalViews > 0)
                        insightsData.views.total = totalViews;
                }
            }
            catch (apiErr) {
                console.log("Not able to fetch advanced IG insights natively, using computed basic data.");
                // Just failing gracefully. We already populated basic interactions above.
                console.log("IG API Insights Err:", ((_a = apiErr === null || apiErr === void 0 ? void 0 : apiErr.response) === null || _a === void 0 ? void 0 : _a.data) || (apiErr === null || apiErr === void 0 ? void 0 : apiErr.message));
            }
        }
        catch (err) {
            console.error("Failed to build insights data structure calculations:", err);
        }
        let demographicsData = {};
        // Attempt to fetch Audience Demographics (requires lifetime period)
        try {
            const demoUrl = `https://graph.instagram.com/${igUserId}/insights`;
            // First try the older metrics that still apply to many graph tokens
            let demoParams = {
                metric: "audience_city,audience_country,audience_gender_age",
                period: "lifetime",
                access_token: accessToken,
            };
            let fetchedDemo = false;
            try {
                const { data: demoRes } = yield axios_1.default.get(demoUrl, { params: demoParams });
                if (demoRes && demoRes.data) {
                    fetchedDemo = true;
                    demoRes.data.forEach((metric) => {
                        if (metric.values && metric.values.length > 0) {
                            demographicsData[metric.name] = metric.values[0].value || {};
                        }
                    });
                }
            }
            catch (oldDemoErr) {
                // Ignore, we will try the modern endpoint
            }
            if (!fetchedDemo) {
                // Modern Creator/Business Metric syntax
                demoParams = {
                    metric: "follower_demographics",
                    period: "lifetime",
                    timeframe: "last_30_days",
                    breakdown: "age,gender,city,country",
                    access_token: accessToken,
                };
                const { data: modernDemoRes } = yield axios_1.default.get(demoUrl, { params: demoParams });
                if (modernDemoRes && modernDemoRes.data) {
                    modernDemoRes.data.forEach((metric) => {
                        // Flatten modern demographics if available
                        if (metric.total_value && metric.total_value.breakdowns) {
                            metric.total_value.breakdowns.forEach((breakdown) => {
                                var _a, _b;
                                const breakdownName = ((_a = breakdown.dimension_keys) === null || _a === void 0 ? void 0 : _a.join("_")) || "distribution";
                                const mappedValues = {};
                                (_b = breakdown.results) === null || _b === void 0 ? void 0 : _b.forEach((res) => {
                                    var _a;
                                    const key = ((_a = res.dimension_values) === null || _a === void 0 ? void 0 : _a.join("-")) || "unknown";
                                    mappedValues[key] = res.value;
                                });
                                demographicsData[`follower_demographics_${breakdownName}`] = mappedValues;
                            });
                        }
                        else if (metric.values && metric.values.length > 0) {
                            demographicsData[metric.name] = metric.values[0].value || {};
                        }
                    });
                }
            }
        }
        catch (demoErr) {
            console.log("Not able to fetch advanced IG audience demographics natively.");
            console.log("IG API Demographics Err:", ((_b = demoErr === null || demoErr === void 0 ? void 0 : demoErr.response) === null || _b === void 0 ? void 0 : _b.data) || (demoErr === null || demoErr === void 0 ? void 0 : demoErr.message));
        }
        return {
            overview: {
                id: profileData.id || "",
                username: profileData.username || "",
                name: profileData.name || "",
                account_type: profileData.account_type || "",
                profile_picture_url: profileData.profile_picture_url || "",
                followersCount: profileData.followers_count || 0,
                followsCount: profileData.follows_count || 0,
                mediaCount: profileData.media_count || 0,
            },
            content: {
                publishedContent,
            },
            audience: {
                followers: profileData.followers_count || 0,
                demographics: demographicsData,
            },
            insights: insightsData,
        };
    });
}
exports.buildInstagramDashboardBuilder = buildInstagramDashboardBuilder;
