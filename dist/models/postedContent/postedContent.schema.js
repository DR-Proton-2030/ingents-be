"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const model_constant_1 = __importDefault(require("../../constants/model/model.constant"));
const schemaOption_1 = require("../../constants/model/schemaOption");
const postedContentSchema = new mongoose_1.Schema({
    user_id: Object.assign(Object.assign({}, model_constant_1.default.requiredObjectId), { ref: "users" }),
    scheduled_post_id: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "scheduled_posts",
        default: null,
    },
    platform: {
        type: String,
        required: true,
        enum: ["facebook", "instagram", "youtube", "x"],
    },
    content: model_constant_1.default.requiredString,
    media_urls: {
        type: [String],
        default: [],
    },
    media_type: {
        type: String,
        enum: ["image", "video", "text"],
        default: "text",
    },
    hashtags: {
        type: [String],
        default: [],
    },
    posted_at: model_constant_1.default.requiredDate,
    platform_post_id: model_constant_1.default.optionalNullString,
    platform_response: {
        type: mongoose_1.Schema.Types.Mixed,
        default: {},
    },
    page_id: model_constant_1.default.optionalNullString,
    channel_id: model_constant_1.default.optionalNullString,
    engagement: {
        likes: { type: Number, default: 0 },
        comments: { type: Number, default: 0 },
        shares: { type: Number, default: 0 },
        views: { type: Number, default: 0 },
    },
    is_scheduled: {
        type: Boolean,
        required: true,
        default: false,
    },
    status: {
        type: String,
        enum: ["published", "failed"],
        default: "published",
    },
    error_message: model_constant_1.default.optionalNullString,
    last_metrics_sync: model_constant_1.default.optionalNullDate,
}, Object.assign(Object.assign({}, schemaOption_1.GENERAL_SCHEMA_OPTIONS), { toJSON: { virtuals: true }, toObject: { virtuals: true } }));
// Index for efficient querying
postedContentSchema.index({ user_id: 1, platform: 1 });
postedContentSchema.index({ posted_at: -1 });
postedContentSchema.index({ scheduled_post_id: 1 });
exports.default = postedContentSchema;
