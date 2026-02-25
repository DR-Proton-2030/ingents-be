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
exports.getSnapshot = exports.fetchAndStoreYoutubeData = void 0;
const youtube_service_1 = require("./youtube.service");
const channel_1 = require("./data/channel");
const dates_1 = require("./utils/dates");
const uploads_1 = require("./data/uploads");
const videos_1 = require("./data/videos");
const iso_1 = require("./utils/iso");
const geography_1 = require("./analytics/geography");
const overview_1 = require("./analytics/overview");
const audience_1 = require("./analytics/audience");
const traffic_1 = require("./analytics/traffic");
const content_1 = require("./analytics/content");
const users_model_1 = __importDefault(require("../../models/users/users.model"));
const socialData_model_1 = __importDefault(require("../../models/socialData/socialData.model"));
const postedContent_model_1 = __importDefault(require("../../models/postedContent/postedContent.model"));
const fetchAndStoreYoutubeData = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7;
    try {
        const user = yield users_model_1.default.findById(userId);
        if (!user || !((_a = user.youtube) === null || _a === void 0 ? void 0 : _a.access_token)) {
            throw new Error("User or YouTube token not found");
        }
        const { youtube, analytics } = yield (0, youtube_service_1.getAuthorizedClient)(user.youtube.access_token);
        // 1. Channel info
        const { channelData, channelId, uploadsPlaylistId } = yield (0, channel_1.fetchChannelInfo)(youtube);
        // 2. Dates for Analytics
        const daysParam = 30;
        const { start: startDate, end: endDate } = (0, dates_1.getCustomWindow)(daysParam);
        const todayStr = (0, dates_1.getTodayStr)();
        const last48hStartStr = (0, dates_1.getLast48hStartStr)();
        const last28dStartStr = (0, dates_1.getLast28dStartStr)();
        // 3. Parallel fetching
        const [videosResp, subscriptionsResp, activitiesResp, playlistsResp, commentsResp,] = yield Promise.all([
            uploadsPlaylistId
                ? youtube.playlistItems.list({
                    part: ["snippet", "contentDetails"],
                    playlistId: uploadsPlaylistId,
                    maxResults: 15,
                })
                : Promise.resolve({ data: { items: [] } }),
            youtube.subscriptions.list({
                part: ["snippet", "subscriberSnippet"],
                myRecentSubscribers: true,
                maxResults: 10,
            }),
            youtube.activities.list({
                part: ["snippet", "contentDetails"],
                mine: true,
                maxResults: 10,
            }),
            youtube.playlists.list({
                part: ["snippet", "contentDetails", "status"],
                mine: true,
                maxResults: 10,
            }),
            youtube.commentThreads.list({
                part: ["snippet", "replies"],
                allThreadsRelatedToChannelId: channelId,
                maxResults: 10,
            }),
        ]);
        const [analyticsReport, growthReport, ageReport, genderReport, overviewReport, trafficSourceReport, deviceTypeReport, topVideosReport, provincesUSReport, provincesCAReport,] = yield Promise.all([
            (0, geography_1.getTopCountries)(analytics, channelId, startDate, endDate, 5),
            (0, overview_1.getGrowth)(analytics, channelId, startDate, endDate),
            (0, audience_1.getAgeReport)(analytics, channelId, startDate, endDate),
            (0, audience_1.getGenderReport)(analytics, channelId, startDate, endDate),
            (0, overview_1.getOverview)(analytics, channelId, startDate, endDate),
            (0, traffic_1.getTrafficSources)(analytics, channelId, startDate, endDate),
            (0, audience_1.getDeviceTypes)(analytics, channelId, startDate, endDate),
            (0, content_1.getTopVideosWithRetention)(analytics, channelId, startDate, endDate, 10),
            (0, geography_1.getProvincesUS)(analytics, channelId, startDate, endDate, 10),
            (0, geography_1.getProvincesCAEmpty)(),
        ]);
        // Dashboard specific reports
        const [topContent48hReport, overview28dReport, topContent28dReport, subscribedStatus28dReport, trafficSources28dReport,] = yield Promise.all([
            (0, content_1.getTopContent)(analytics, channelId, last48hStartStr, todayStr, 10),
            (0, overview_1.getOverview)(analytics, channelId, last28dStartStr, todayStr),
            (0, content_1.getTopContent)(analytics, channelId, last28dStartStr, todayStr, 10),
            (0, audience_1.getSubscribedStatus)(analytics, channelId, last28dStartStr, todayStr),
            (0, traffic_1.getTrafficSources)(analytics, channelId, last28dStartStr, todayStr),
        ]);
        const allUploadItems = yield (0, uploads_1.paginateUploads)(youtube, uploadsPlaylistId || null, videosResp);
        const videoIds = (allUploadItems || [])
            .map((v) => { var _a; return (_a = v.contentDetails) === null || _a === void 0 ? void 0 : _a.videoId; })
            .filter((id) => !!id);
        const videoStatsMap = yield (0, videos_1.fetchVideoStatsMap)(youtube, videoIds);
        // Update engagement for posted content
        yield Promise.all(Object.entries(videoStatsMap).map((_8) => __awaiter(void 0, [_8], void 0, function* ([vId, data]) {
            const stats = data.statistics;
            if (stats) {
                yield postedContent_model_1.default.findOneAndUpdate({ platform_post_id: vId, platform: "youtube", user_id: userId }, {
                    $set: {
                        engagement: {
                            views: Number(stats.viewCount || 0),
                            likes: Number(stats.likeCount || 0),
                            comments: Number(stats.commentCount || 0),
                        },
                    },
                });
            }
        })));
        const topVideoIds = (((_b = topVideosReport === null || topVideosReport === void 0 ? void 0 : topVideosReport.data) === null || _b === void 0 ? void 0 : _b.rows) || [])
            .map((row) => row === null || row === void 0 ? void 0 : row[0])
            .filter((id) => typeof id === "string" && !!id);
        const topVideoStatsMap = yield (0, videos_1.fetchMetaForVideos)(youtube, topVideoIds);
        let shortsCount = 0;
        let videosCount = 0;
        let liveCount = 0;
        (activitiesResp.data.items || []).forEach((act) => {
            var _a;
            if (((_a = act.snippet) === null || _a === void 0 ? void 0 : _a.type) === "liveStream")
                liveCount++;
        });
        Object.values(videoStatsMap).forEach((v) => {
            var _a;
            const sec = (0, iso_1.isoToSeconds)((_a = v === null || v === void 0 ? void 0 : v.contentDetails) === null || _a === void 0 ? void 0 : _a.duration);
            if (sec > 0) {
                if (sec < 60)
                    shortsCount++;
                else
                    videosCount++;
            }
        });
        const postSchedule = Object.values(videoStatsMap)
            .filter((v) => {
            var _a;
            const publishAt = (_a = v.status) === null || _a === void 0 ? void 0 : _a.publishAt;
            return publishAt && new Date(publishAt).getTime() > Date.now();
        })
            .map((v) => {
            var _a, _b, _c, _d;
            return ({
                id: v.id,
                title: ((_a = v.snippet) === null || _a === void 0 ? void 0 : _a.title) || "",
                scheduledAt: (_b = v.status) === null || _b === void 0 ? void 0 : _b.publishAt,
                privacyStatus: (_c = v.status) === null || _c === void 0 ? void 0 : _c.privacyStatus,
                thumbnails: (_d = v.snippet) === null || _d === void 0 ? void 0 : _d.thumbnails,
            });
        })
            .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
        const resultData = {
            channel: {
                id: channelId,
                title: ((_c = channelData.snippet) === null || _c === void 0 ? void 0 : _c.title) || "",
                handle: ((_d = channelData.snippet) === null || _d === void 0 ? void 0 : _d.customUrl) || "",
                description: ((_e = channelData.snippet) === null || _e === void 0 ? void 0 : _e.description) || "",
                thumbnails: (_f = channelData.snippet) === null || _f === void 0 ? void 0 : _f.thumbnails,
                statistics: channelData.statistics,
                branding: channelData.brandingSettings,
            },
            demographics: {
                topLocations: ((_h = (_g = analyticsReport === null || analyticsReport === void 0 ? void 0 : analyticsReport.data) === null || _g === void 0 ? void 0 : _g.rows) === null || _h === void 0 ? void 0 : _h.map((row) => ({
                    country: row[0],
                    views: row[1],
                }))) || [],
                ageRange: ((_k = (_j = ageReport === null || ageReport === void 0 ? void 0 : ageReport.data) === null || _j === void 0 ? void 0 : _j.rows) === null || _k === void 0 ? void 0 : _k.map((row) => ({
                    ageGroup: row[0],
                    views: row[1],
                }))) || [],
                gender: ((_m = (_l = genderReport === null || genderReport === void 0 ? void 0 : genderReport.data) === null || _l === void 0 ? void 0 : _l.rows) === null || _m === void 0 ? void 0 : _m.map((row) => ({
                    gender: row[0],
                    views: row[1],
                }))) || [],
            },
            postActivity: {
                shorts: shortsCount,
                videos: videosCount,
                lives: liveCount,
                growthTrend: ((_p = (_o = growthReport === null || growthReport === void 0 ? void 0 : growthReport.data) === null || _o === void 0 ? void 0 : _o.rows) === null || _p === void 0 ? void 0 : _p.map((row) => ({
                    date: row[0],
                    views: row[1],
                    subscribersGained: row[2],
                }))) || [],
            },
            recentVideos: (allUploadItems || []).map((item) => {
                var _a, _b, _c, _d, _e, _f, _g;
                const vId = (_a = item.contentDetails) === null || _a === void 0 ? void 0 : _a.videoId;
                const stats = videoStatsMap[vId] || {};
                return {
                    id: vId || "",
                    title: ((_b = item.snippet) === null || _b === void 0 ? void 0 : _b.title) || "",
                    publishedAt: ((_c = item.contentDetails) === null || _c === void 0 ? void 0 : _c.videoPublishedAt) ||
                        ((_d = item.snippet) === null || _d === void 0 ? void 0 : _d.publishedAt) ||
                        "",
                    thumbnails: (_e = item.snippet) === null || _e === void 0 ? void 0 : _e.thumbnails,
                    statistics: stats.statistics,
                    duration: ((_f = stats.contentDetails) === null || _f === void 0 ? void 0 : _f.duration) || "",
                    privacyStatus: ((_g = stats.status) === null || _g === void 0 ? void 0 : _g.privacyStatus) || "public",
                };
            }),
            recentSubscribers: (subscriptionsResp.data.items || []).map((item) => {
                var _a, _b, _c, _d;
                return ({
                    channelId: (_a = item.subscriberSnippet) === null || _a === void 0 ? void 0 : _a.channelId,
                    title: (_b = item.subscriberSnippet) === null || _b === void 0 ? void 0 : _b.title,
                    thumbnails: (_c = item.subscriberSnippet) === null || _c === void 0 ? void 0 : _c.thumbnails,
                    subscribedAt: (_d = item.snippet) === null || _d === void 0 ? void 0 : _d.publishedAt,
                });
            }),
            recentComments: (commentsResp.data.items || []).map((thread) => {
                var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p;
                return ({
                    id: thread.id,
                    videoId: (_a = thread.snippet) === null || _a === void 0 ? void 0 : _a.videoId,
                    text: (_d = (_c = (_b = thread.snippet) === null || _b === void 0 ? void 0 : _b.topLevelComment) === null || _c === void 0 ? void 0 : _c.snippet) === null || _d === void 0 ? void 0 : _d.textDisplay,
                    author: (_g = (_f = (_e = thread.snippet) === null || _e === void 0 ? void 0 : _e.topLevelComment) === null || _f === void 0 ? void 0 : _f.snippet) === null || _g === void 0 ? void 0 : _g.authorDisplayName,
                    authorProfileImageUrl: (_k = (_j = (_h = thread.snippet) === null || _h === void 0 ? void 0 : _h.topLevelComment) === null || _j === void 0 ? void 0 : _j.snippet) === null || _k === void 0 ? void 0 : _k.authorProfileImageUrl,
                    publishedAt: (_o = (_m = (_l = thread.snippet) === null || _l === void 0 ? void 0 : _l.topLevelComment) === null || _m === void 0 ? void 0 : _m.snippet) === null || _o === void 0 ? void 0 : _o.publishedAt,
                    replyCount: (_p = thread.snippet) === null || _p === void 0 ? void 0 : _p.totalReplyCount,
                });
            }),
            postSchedule,
            analytics: {
                overview: (() => {
                    var _a;
                    const rows = ((_a = overviewReport === null || overviewReport === void 0 ? void 0 : overviewReport.data) === null || _a === void 0 ? void 0 : _a.rows) || [];
                    const totals = rows[0] || [];
                    const [views, minutes, avgViewDuration, avgViewPercentage, subsGained, subsLost,] = totals;
                    return {
                        views: Number(views || 0),
                        watchTimeMinutes: Number(minutes || 0),
                        averageViewDuration: Number(avgViewDuration || 0),
                        averageViewPercentage: Number(avgViewPercentage || 0),
                        impressions: 0,
                        impressionsCtr: 0,
                        subscribersGained: Number(subsGained || 0),
                        subscribersLost: Number(subsLost || 0),
                        netSubscribers: Number((subsGained || 0) - (subsLost || 0)),
                    };
                })(),
                dailyTrend: ((_r = (_q = growthReport === null || growthReport === void 0 ? void 0 : growthReport.data) === null || _q === void 0 ? void 0 : _q.rows) === null || _r === void 0 ? void 0 : _r.map((row) => ({
                    date: row[0],
                    views: Number(row[1] || 0),
                    subscribersGained: Number(row[2] || 0),
                }))) || [],
                trafficSources: ((_t = (_s = trafficSourceReport === null || trafficSourceReport === void 0 ? void 0 : trafficSourceReport.data) === null || _s === void 0 ? void 0 : _s.rows) === null || _t === void 0 ? void 0 : _t.map((row) => ({
                    source: row[0],
                    views: Number(row[1] || 0),
                    watchTimeMinutes: Number(row[2] || 0),
                    impressions: 0,
                    impressionsCtr: 0,
                }))) || [],
                devices: ((_v = (_u = deviceTypeReport === null || deviceTypeReport === void 0 ? void 0 : deviceTypeReport.data) === null || _u === void 0 ? void 0 : _u.rows) === null || _v === void 0 ? void 0 : _v.map((row) => ({
                    deviceType: row[0],
                    views: Number(row[1] || 0),
                    watchTimeMinutes: Number(row[2] || 0),
                }))) || [],
                topVideos: ((_x = (_w = topVideosReport === null || topVideosReport === void 0 ? void 0 : topVideosReport.data) === null || _w === void 0 ? void 0 : _w.rows) === null || _x === void 0 ? void 0 : _x.map((row) => {
                    var _a, _b, _c, _d, _e;
                    const videoId = row[0];
                    const meta = topVideoStatsMap[videoId] || {};
                    return {
                        videoId,
                        views: Number(row[1] || 0),
                        watchTimeMinutes: Number(row[2] || 0),
                        averageViewDuration: Number(row[3] || 0),
                        averageViewPercentage: Number(row[4] || 0),
                        title: (_a = meta.snippet) === null || _a === void 0 ? void 0 : _a.title,
                        thumbnails: (_b = meta.snippet) === null || _b === void 0 ? void 0 : _b.thumbnails,
                        duration: (_c = meta.contentDetails) === null || _c === void 0 ? void 0 : _c.duration,
                        privacyStatus: (_d = meta.status) === null || _d === void 0 ? void 0 : _d.privacyStatus,
                        publishedAt: (_e = meta.snippet) === null || _e === void 0 ? void 0 : _e.publishedAt,
                        statistics: meta.statistics,
                        url: videoId
                            ? `https://www.youtube.com/watch?v=${videoId}`
                            : undefined,
                    };
                })) || [],
                geography: {
                    countries: ((_z = (_y = analyticsReport === null || analyticsReport === void 0 ? void 0 : analyticsReport.data) === null || _y === void 0 ? void 0 : _y.rows) === null || _z === void 0 ? void 0 : _z.map((row) => ({
                        country: row[0],
                        views: Number(row[1] || 0),
                        watchTimeMinutes: Number(row[2] || 0),
                        averageViewDuration: Number(row[3] || 0),
                    }))) || [],
                    provincesUS: ((_1 = (_0 = provincesUSReport === null || provincesUSReport === void 0 ? void 0 : provincesUSReport.data) === null || _0 === void 0 ? void 0 : _0.rows) === null || _1 === void 0 ? void 0 : _1.map((row) => ({
                        province: row[0],
                        views: Number(row[1] || 0),
                        watchTimeMinutes: Number(row[2] || 0),
                        averageViewDuration: Number(row[3] || 0),
                    }))) || [],
                    provincesCA: ((_3 = (_2 = provincesCAReport === null || provincesCAReport === void 0 ? void 0 : provincesCAReport.data) === null || _2 === void 0 ? void 0 : _2.rows) === null || _3 === void 0 ? void 0 : _3.map((row) => ({
                        province: row[0],
                        views: Number(row[1] || 0),
                        watchTimeMinutes: Number(row[2] || 0),
                        averageViewDuration: Number(row[3] || 0),
                    }))) || [],
                },
                revenue: {
                    overview: {
                        estimatedRevenue: 0,
                        adImpressions: 0,
                        monetizedPlaybacks: 0,
                        playbackBasedCpm: 0,
                    },
                    byDay: [],
                },
            },
            dashboard: {
                topContent48h: ((_4 = topContent48hReport === null || topContent48hReport === void 0 ? void 0 : topContent48hReport.data) === null || _4 === void 0 ? void 0 : _4.rows) || [],
                overview28d: (() => {
                    var _a, _b;
                    const rows = ((_a = overview28dReport === null || overview28dReport === void 0 ? void 0 : overview28dReport.data) === null || _a === void 0 ? void 0 : _a.rows) || [];
                    const totals = rows[0] || [];
                    const [views, minutes, , , subsGained, subsLost] = totals;
                    return {
                        totalViews: Number(views || 0),
                        totalWatchTimeHours: Number((Number(minutes || 0) / 60).toFixed(2)),
                        subscribersGained: Number(subsGained || 0),
                        subscribersLost: Number(subsLost || 0),
                        netSubscribers: Number((subsGained || 0) - (subsLost || 0)),
                        topContent: ((_b = topContent28dReport === null || topContent28dReport === void 0 ? void 0 : topContent28dReport.data) === null || _b === void 0 ? void 0 : _b.rows) || [],
                    };
                })(),
                contentTab: {
                    views: Number(((_7 = (_6 = (_5 = overview28dReport === null || overview28dReport === void 0 ? void 0 : overview28dReport.data) === null || _5 === void 0 ? void 0 : _5.rows) === null || _6 === void 0 ? void 0 : _6[0]) === null || _7 === void 0 ? void 0 : _7[0]) || 0),
                    publishedContent: [],
                    viewerBreakdown: {},
                },
                trafficSources: (() => {
                    var _a;
                    const rows = ((_a = trafficSources28dReport === null || trafficSources28dReport === void 0 ? void 0 : trafficSources28dReport.data) === null || _a === void 0 ? void 0 : _a.rows) || [];
                    const totalViews = rows.reduce((acc, row) => acc + Number(row[1] || 0), 0);
                    return rows.map((row) => ({
                        source: row[0],
                        views: Number(row[1] || 0),
                        percentage: totalViews > 0
                            ? Number(((Number(row[1] || 0) / totalViews) * 100).toFixed(2))
                            : 0,
                    }));
                })(),
                audience: (() => {
                    var _a, _b;
                    const rows = ((_a = overview28dReport === null || overview28dReport === void 0 ? void 0 : overview28dReport.data) === null || _a === void 0 ? void 0 : _a.rows) || [];
                    const totals = rows[0] || [];
                    const [views, minutes, , , subsGained, subsLost] = totals;
                    const subRows = ((_b = subscribedStatus28dReport === null || subscribedStatus28dReport === void 0 ? void 0 : subscribedStatus28dReport.data) === null || _b === void 0 ? void 0 : _b.rows) || [];
                    let subPercent = 0;
                    const totalViews = Number(views || 0);
                    if (totalViews > 0) {
                        const subViews = subRows.reduce((acc, r) => {
                            if (r[0] === "subscribed")
                                return acc + Number(r[1] || 0);
                            return acc;
                        }, 0);
                        subPercent = (subViews / totalViews) * 100;
                    }
                    return {
                        views: totalViews,
                        watchTimeHours: Number((Number(minutes || 0) / 60).toFixed(2)),
                        subscribersNet: Number((subsGained || 0) - (subsLost || 0)),
                        watchTimeSplit: {
                            subscribedPercent: Number(subPercent.toFixed(2)),
                            notSubscribedPercent: Number((100 - subPercent).toFixed(2)),
                        },
                    };
                })(),
            },
        };
        // Update snapshot in SocialDataModel
        yield socialData_model_1.default.findOneAndUpdate({ user_object_id: userId, platform_name: "youtube" }, {
            $set: {
                platform_id: channelId,
                data: resultData,
                is_active: true,
                last_synced_at: new Date(),
                updatedAt: new Date(),
            },
        }, { upsert: true });
        return resultData;
    }
    catch (error) {
        console.error("Error in fetchAndStoreYoutubeData:", error);
        throw error;
    }
});
exports.fetchAndStoreYoutubeData = fetchAndStoreYoutubeData;
const getSnapshot = (userId_1, ...args_1) => __awaiter(void 0, [userId_1, ...args_1], void 0, function* (userId, platform = "youtube") {
    return yield socialData_model_1.default.findOne({ user_object_id: userId, platform_name: platform });
});
exports.getSnapshot = getSnapshot;
/**
 * Daily cron to update snapshots for all connected YouTube users.
 */
// export const dailyYouTubeSnapshotCron = async () => {
//   console.log("[SnapshotService] Starting daily YouTube snapshot cron...");
//   const users = await UserModel.find({ "youtube.access_token": { $ne: null } })
//     .select({ _id: 1 })
//     .lean();
//   for (const u of users as any[]) {
//     try {
//       console.log(`[SnapshotService] Syncing snapshot for user: ${u._id}`);
//       await fetchAndStoreYoutubeData(u._id.toString());
//     } catch (err: any) {
//       console.error(
//         `[SnapshotService] Failed to sync snapshot for user ${u._id}:`,
//         err.message,
//       );
//     }
//   }
//   console.log("[SnapshotService] Daily YouTube snapshot cron completed.");
// };
