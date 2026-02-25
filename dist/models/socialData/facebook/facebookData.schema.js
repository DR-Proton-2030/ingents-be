"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.facebookMetricsSchema = void 0;
const mongoose_1 = require("mongoose");
const model_constant_1 = __importDefault(require("../../../constants/model/model.constant"));
const facebookPageSchema = new mongoose_1.Schema({
    id: model_constant_1.default.optionalNullString,
    name: model_constant_1.default.optionalNullString,
    fan_count: model_constant_1.default.optionalNullNumber,
    followers_count: model_constant_1.default.optionalNullNumber,
    picture: model_constant_1.default.optionalNullObject,
}, { _id: true });
const topContentItemSchema = new mongoose_1.Schema({
    id: model_constant_1.default.optionalNullString,
    title: model_constant_1.default.optionalNullString,
    thumbnail: model_constant_1.default.optionalNullString,
    created_time: model_constant_1.default.optionalNullString,
    views: model_constant_1.default.optionalNullNumber,
    viewTime: model_constant_1.default.optionalNullNumber,
    permalink_url: model_constant_1.default.optionalNullString,
}, { _id: true });
const facebookContentItemSchema = new mongoose_1.Schema({
    id: model_constant_1.default.optionalNullString,
    type: model_constant_1.default.optionalNullString,
    title: model_constant_1.default.optionalNullString,
    permalink_url: model_constant_1.default.optionalNullString,
    created_time: model_constant_1.default.optionalNullString,
    thumbnail: model_constant_1.default.optionalNullString,
}, { _id: true });
const facebookOverviewSchema = new mongoose_1.Schema({
    views: model_constant_1.default.optionalNullNumber,
    views3s: model_constant_1.default.optionalNullNumber,
    views1m: model_constant_1.default.optionalNullNumber,
    watchTime: model_constant_1.default.optionalNullNumber,
    threeSecondViewsUnavailable: model_constant_1.default.optionalBoolean,
    oneMinuteViewsUnavailable: model_constant_1.default.optionalBoolean,
    followersGained: model_constant_1.default.optionalNullNumber,
    followersLost: model_constant_1.default.optionalNullNumber,
    netFollowers: model_constant_1.default.optionalNullNumber,
    viewsOverTime: [new mongoose_1.Schema({}, { _id: true, strict: false })],
    topContent: [topContentItemSchema],
}, { _id: true });
const facebookContentTabSchema = new mongoose_1.Schema({
    totalViews: model_constant_1.default.optionalNullNumber,
    publishedContent: [facebookContentItemSchema],
    viewerTypeUnavailable: model_constant_1.default.optionalBoolean,
    viewerTypes: [new mongoose_1.Schema({}, { _id: true, strict: false })],
}, { _id: true });
const facebookEngagementSchema = new mongoose_1.Schema({
    totals: new mongoose_1.Schema({}, { _id: true, strict: false }),
    engagementOverTimeUnavailable: model_constant_1.default.optionalBoolean,
}, { _id: true });
const facebookAudienceSchema = new mongoose_1.Schema({
    followers: model_constant_1.default.optionalNullNumber,
    totalViews: model_constant_1.default.optionalNullNumber,
    watchTimeSplitUnavailable: model_constant_1.default.optionalBoolean,
    watchTimeSplit: [
        new mongoose_1.Schema({
            label: model_constant_1.default.optionalNullString,
            value: model_constant_1.default.optionalNullNumber,
        }, { _id: true }),
    ],
    demographics: new mongoose_1.Schema({
        ageGender: [new mongoose_1.Schema({ label: String, value: Number }, { _id: true })],
        countries: [new mongoose_1.Schema({ label: String, value: Number }, { _id: true })],
        cities: [new mongoose_1.Schema({ label: String, value: Number }, { _id: true })],
    }, { _id: true }),
}, { _id: true });
const facebookTrafficSourcesSchema = new mongoose_1.Schema({
    sources: [new mongoose_1.Schema({}, { _id: true, strict: false })],
    trafficSourcesUnavailable: model_constant_1.default.optionalBoolean,
}, { _id: true });
const facebookImpressionsSchema = new mongoose_1.Schema({
    impressionsUnavailable: model_constant_1.default.optionalBoolean,
    reason: model_constant_1.default.optionalNullString,
    impressions: model_constant_1.default.optionalNullNumber,
    ctr: model_constant_1.default.optionalNullNumber,
    watchTimeFromImpressions: model_constant_1.default.optionalNullNumber,
}, { _id: true });
exports.facebookMetricsSchema = new mongoose_1.Schema({
    page: facebookPageSchema,
    overview: facebookOverviewSchema,
    content: facebookContentTabSchema,
    engagement: facebookEngagementSchema,
    audience: facebookAudienceSchema,
    trafficSources: facebookTrafficSourcesSchema,
    impressions: facebookImpressionsSchema,
}, { _id: true });
