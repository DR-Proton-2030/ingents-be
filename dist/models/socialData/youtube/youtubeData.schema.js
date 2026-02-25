"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.youtubeMetricsSchema = void 0;
const mongoose_1 = require("mongoose");
const schemaOption_1 = require("../../../constants/model/schemaOption");
const model_constant_1 = __importDefault(require("../../../constants/model/model.constant"));
// --- Sub-Schemas for nested objects ---
const channelSchema = new mongoose_1.Schema({
    id: model_constant_1.default.optionalNullString,
    title: model_constant_1.default.optionalNullString,
    handle: model_constant_1.default.optionalNullString,
    description: model_constant_1.default.optionalNullString,
    thumbnails: model_constant_1.default.optionalNullObject,
    statistics: model_constant_1.default.optionalNullObject,
    branding: model_constant_1.default.optionalNullObject,
}, { _id: true });
const demographicsSchema = new mongoose_1.Schema({
    topLocations: [
        new mongoose_1.Schema({
            country: model_constant_1.default.optionalNullString,
            views: model_constant_1.default.optionalNullNumber,
        }, { _id: true }),
    ],
    ageRange: [
        new mongoose_1.Schema({
            ageGroup: model_constant_1.default.optionalNullString,
            views: model_constant_1.default.optionalNullNumber,
        }, { _id: true }),
    ],
    gender: [
        new mongoose_1.Schema({
            gender: model_constant_1.default.optionalNullString,
            views: model_constant_1.default.optionalNullNumber,
        }, { _id: true }),
    ],
}, { _id: true });
const postActivitySchema = new mongoose_1.Schema({
    shorts: model_constant_1.default.optionalNullNumber,
    videos: model_constant_1.default.optionalNullNumber,
    lives: model_constant_1.default.optionalNullNumber,
    growthTrend: [
        new mongoose_1.Schema({
            date: model_constant_1.default.optionalNullString,
            views: model_constant_1.default.optionalNullNumber,
            subscribersGained: model_constant_1.default.optionalNullNumber,
        }, { _id: true }),
    ],
}, { _id: true });
const recentVideoSchema = new mongoose_1.Schema({
    id: model_constant_1.default.optionalNullString,
    title: model_constant_1.default.optionalNullString,
    publishedAt: model_constant_1.default.optionalNullString,
    thumbnails: model_constant_1.default.optionalNullObject,
    statistics: model_constant_1.default.optionalNullObject,
    duration: model_constant_1.default.optionalNullString,
    privacyStatus: model_constant_1.default.optionalNullString,
}, { _id: true });
const recentSubscriberSchema = new mongoose_1.Schema({
    channelId: model_constant_1.default.optionalNullString,
    title: model_constant_1.default.optionalNullString,
    thumbnails: model_constant_1.default.optionalNullObject,
    subscribedAt: model_constant_1.default.optionalNullString,
}, { _id: true });
const recentCommentSchema = new mongoose_1.Schema({
    id: model_constant_1.default.optionalNullString,
    videoId: model_constant_1.default.optionalNullString,
    text: model_constant_1.default.optionalNullString,
    author: model_constant_1.default.optionalNullString,
    authorProfileImageUrl: model_constant_1.default.optionalNullString,
    publishedAt: model_constant_1.default.optionalNullString,
    replyCount: model_constant_1.default.optionalNullNumber,
}, { _id: true });
const postScheduleSchema = new mongoose_1.Schema({
    id: model_constant_1.default.optionalNullString,
    title: model_constant_1.default.optionalNullString,
    scheduledAt: model_constant_1.default.optionalNullString,
    privacyStatus: model_constant_1.default.optionalNullString,
    thumbnails: model_constant_1.default.optionalNullObject,
}, { _id: true });
// --- Analytics & Revenue Sub-Schemas ---
const analyticsOverviewSchema = new mongoose_1.Schema({
    views: model_constant_1.default.optionalNullNumber,
    watchTimeMinutes: model_constant_1.default.optionalNullNumber,
    averageViewDuration: model_constant_1.default.optionalNullNumber,
    averageViewPercentage: model_constant_1.default.optionalNullNumber,
    impressions: model_constant_1.default.optionalNullNumber,
    impressionsCtr: model_constant_1.default.optionalNullNumber,
    subscribersGained: model_constant_1.default.optionalNullNumber,
    subscribersLost: model_constant_1.default.optionalNullNumber,
    netSubscribers: model_constant_1.default.optionalNullNumber,
}, { _id: true });
const revenueSchema = new mongoose_1.Schema({
    overview: new mongoose_1.Schema({
        estimatedRevenue: model_constant_1.default.optionalNullNumber,
        adImpressions: model_constant_1.default.optionalNullNumber,
        monetizedPlaybacks: model_constant_1.default.optionalNullNumber,
        playbackBasedCpm: model_constant_1.default.optionalNullNumber,
    }, { _id: true }),
    byDay: [
        new mongoose_1.Schema({
            date: model_constant_1.default.optionalNullString,
            estimatedRevenue: model_constant_1.default.optionalNullNumber,
            adImpressions: model_constant_1.default.optionalNullNumber,
            monetizedPlaybacks: model_constant_1.default.optionalNullNumber,
            playbackBasedCpm: model_constant_1.default.optionalNullNumber,
        }, { _id: true }),
    ],
}, { _id: true });
const analyticsSchema = new mongoose_1.Schema({
    overview: analyticsOverviewSchema,
    dailyTrend: [
        new mongoose_1.Schema({
            date: model_constant_1.default.optionalNullString,
            views: model_constant_1.default.optionalNullNumber,
            subscribersGained: model_constant_1.default.optionalNullNumber,
        }, { _id: true }),
    ],
    trafficSources: [
        new mongoose_1.Schema({
            source: model_constant_1.default.optionalNullString,
            views: model_constant_1.default.optionalNullNumber,
            watchTimeMinutes: model_constant_1.default.optionalNullNumber,
            impressions: model_constant_1.default.optionalNullNumber,
            impressionsCtr: model_constant_1.default.optionalNullNumber,
        }, { _id: true }),
    ],
    devices: [
        new mongoose_1.Schema({
            deviceType: model_constant_1.default.optionalNullString,
            views: model_constant_1.default.optionalNullNumber,
            watchTimeMinutes: model_constant_1.default.optionalNullNumber,
        }, { _id: true }),
    ],
    topVideos: [
        new mongoose_1.Schema({
            videoId: model_constant_1.default.optionalNullString,
            views: model_constant_1.default.optionalNullNumber,
            watchTimeMinutes: model_constant_1.default.optionalNullNumber,
            averageViewDuration: model_constant_1.default.optionalNullNumber,
            averageViewPercentage: model_constant_1.default.optionalNullNumber,
            title: model_constant_1.default.optionalNullString,
            thumbnails: model_constant_1.default.optionalNullObject,
            duration: model_constant_1.default.optionalNullString,
            privacyStatus: model_constant_1.default.optionalNullString,
            publishedAt: model_constant_1.default.optionalNullString,
            statistics: model_constant_1.default.optionalNullObject,
            url: model_constant_1.default.optionalNullString,
        }, { _id: true }),
    ],
    geography: new mongoose_1.Schema({
        countries: [
            new mongoose_1.Schema({
                country: model_constant_1.default.optionalNullString,
                views: model_constant_1.default.optionalNullNumber,
                watchTimeMinutes: model_constant_1.default.optionalNullNumber,
                averageViewDuration: model_constant_1.default.optionalNullNumber,
            }, { _id: true }),
        ],
        provincesUS: [
            new mongoose_1.Schema({
                province: model_constant_1.default.optionalNullString,
                views: model_constant_1.default.optionalNullNumber,
                watchTimeMinutes: model_constant_1.default.optionalNullNumber,
                averageViewDuration: model_constant_1.default.optionalNullNumber,
            }, { _id: true }),
        ],
        provincesCA: [
            new mongoose_1.Schema({
                province: model_constant_1.default.optionalNullString,
                views: model_constant_1.default.optionalNullNumber,
                watchTimeMinutes: model_constant_1.default.optionalNullNumber,
                averageViewDuration: model_constant_1.default.optionalNullNumber,
            }, { _id: true }),
        ],
    }, { _id: true }),
    revenue: revenueSchema,
}, { _id: true });
// --- Dashboard Sub-Schemas ---
const dashboardSchema = new mongoose_1.Schema({
    topContent48h: [new mongoose_1.Schema({}, { _id: true, strict: false })],
    overview28d: new mongoose_1.Schema({
        totalViews: model_constant_1.default.optionalNullNumber,
        totalWatchTimeHours: model_constant_1.default.optionalNullNumber,
        subscribersGained: model_constant_1.default.optionalNullNumber,
        subscribersLost: model_constant_1.default.optionalNullNumber,
        netSubscribers: model_constant_1.default.optionalNullNumber,
        topContent: [new mongoose_1.Schema({}, { _id: true, strict: false })],
    }, { _id: true }),
    contentTab: new mongoose_1.Schema({
        views: model_constant_1.default.optionalNullNumber,
        publishedContent: [new mongoose_1.Schema({}, { _id: true, strict: false })],
        viewerBreakdown: model_constant_1.default.optionalNullObject,
    }, { _id: true }),
    trafficSources: [
        new mongoose_1.Schema({
            source: model_constant_1.default.optionalNullString,
            views: model_constant_1.default.optionalNullNumber,
            percentage: model_constant_1.default.optionalNullNumber,
        }, { _id: true }),
    ],
    audience: new mongoose_1.Schema({
        views: model_constant_1.default.optionalNullNumber,
        watchTimeHours: model_constant_1.default.optionalNullNumber,
        subscribersNet: model_constant_1.default.optionalNullNumber,
        watchTimeSplit: new mongoose_1.Schema({
            subscribedPercent: model_constant_1.default.optionalNullNumber,
            notSubscribedPercent: model_constant_1.default.optionalNullNumber,
        }, { _id: true }),
    }, { _id: true }),
}, { _id: true });
// --- Final YouTube Metrics Schema ---
exports.youtubeMetricsSchema = new mongoose_1.Schema({
    channel: channelSchema,
    demographics: demographicsSchema,
    postActivity: postActivitySchema,
    recentVideos: [recentVideoSchema],
    recentSubscribers: [recentSubscriberSchema],
    recentComments: [recentCommentSchema],
    postSchedule: [postScheduleSchema],
    analytics: analyticsSchema,
    dashboard: dashboardSchema,
}, { _id: true });
// --- Full collection Schema ---
const youtubeDataSchema = new mongoose_1.Schema({
    user_object_id: Object.assign(Object.assign({}, model_constant_1.default.requiredObjectId), { ref: "users" }),
    platform_name: Object.assign(Object.assign({}, model_constant_1.default.requiredString), { default: "youtube" }),
    platform_id: model_constant_1.default.requiredString,
    data: exports.youtubeMetricsSchema,
    is_active: model_constant_1.default.optionalBoolean,
    last_synced_at: model_constant_1.default.optionalNullDate,
}, Object.assign(Object.assign({}, schemaOption_1.GENERAL_SCHEMA_OPTIONS), { toJSON: { virtuals: true }, toObject: { virtuals: true } }));
youtubeDataSchema.index({ user_object_id: 1, platform_name: 1 }, { unique: true });
youtubeDataSchema.index({ platform_id: 1 });
exports.default = youtubeDataSchema;
