"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.instagramMetricsSchema = void 0;
const mongoose_1 = require("mongoose");
const model_constant_1 = __importDefault(require("../../../constants/model/model.constant"));
const instagramOverviewSchema = new mongoose_1.Schema({
    id: model_constant_1.default.optionalNullString,
    username: model_constant_1.default.optionalNullString,
    name: model_constant_1.default.optionalNullString,
    account_type: model_constant_1.default.optionalNullString,
    profile_picture_url: model_constant_1.default.optionalNullString,
    followersCount: model_constant_1.default.optionalNullNumber,
    followsCount: model_constant_1.default.optionalNullNumber,
    mediaCount: model_constant_1.default.optionalNullNumber,
    profileViews: model_constant_1.default.optionalNullNumber,
    impressions: model_constant_1.default.optionalNullNumber,
    reach: model_constant_1.default.optionalNullNumber,
}, { _id: true });
const instagramContentItemSchema = new mongoose_1.Schema({
    id: model_constant_1.default.optionalNullString,
    media_type: model_constant_1.default.optionalNullString,
    media_url: model_constant_1.default.optionalNullString,
    media_urls: { type: [String], default: [] },
    permalink: model_constant_1.default.optionalNullString,
    timestamp: model_constant_1.default.optionalNullString,
    caption: model_constant_1.default.optionalNullString,
    like_count: model_constant_1.default.optionalNullNumber,
    comments_count: model_constant_1.default.optionalNullNumber,
}, { _id: true });
const instagramContentSchema = new mongoose_1.Schema({
    publishedContent: [instagramContentItemSchema],
}, { _id: true });
const instagramAudienceSchema = new mongoose_1.Schema({
    followers: model_constant_1.default.optionalNullNumber,
    demographics: new mongoose_1.Schema({}, { _id: true, strict: false }), // flexible for age/gender breakdowns if needed
}, { _id: true });
const instagramInsightsSchema = new mongoose_1.Schema({
    views: {
        total: model_constant_1.default.optionalNullNumber,
        followersPercentage: model_constant_1.default.optionalNullNumber,
        nonFollowersPercentage: model_constant_1.default.optionalNullNumber,
    },
    accountsReached: model_constant_1.default.optionalNullNumber,
    reachByContentType: {
        posts: model_constant_1.default.optionalNullNumber,
        stories: model_constant_1.default.optionalNullNumber,
        reels: model_constant_1.default.optionalNullNumber,
    },
    interactions: {
        total: model_constant_1.default.optionalNullNumber,
        followersPercentage: model_constant_1.default.optionalNullNumber,
        nonFollowersPercentage: model_constant_1.default.optionalNullNumber,
    },
    interactionsByContentType: {
        posts: model_constant_1.default.optionalNullNumber,
        reels: model_constant_1.default.optionalNullNumber,
        stories: model_constant_1.default.optionalNullNumber,
    },
    profileActivity: {
        profileVisits: model_constant_1.default.optionalNullNumber,
        externalLinkTaps: model_constant_1.default.optionalNullNumber,
    },
    responsiveness: {
        dailyResponseRate: model_constant_1.default.optionalNullString,
        dailyResponseTime: model_constant_1.default.optionalNullString,
    },
    conversations: {
        messagingConversationsStarted: model_constant_1.default.optionalNullNumber,
        totalMessagingContacts: model_constant_1.default.optionalNullNumber,
        newMessagingContacts: model_constant_1.default.optionalNullNumber,
        returningMessagingContacts: model_constant_1.default.optionalNullNumber,
    },
    topContentByViews: [new mongoose_1.Schema({}, { strict: false })],
    topContentByInteractions: [new mongoose_1.Schema({}, { strict: false })],
}, { _id: true });
exports.instagramMetricsSchema = new mongoose_1.Schema({
    overview: instagramOverviewSchema,
    content: instagramContentSchema,
    audience: instagramAudienceSchema,
    insights: instagramInsightsSchema,
}, { _id: true });
