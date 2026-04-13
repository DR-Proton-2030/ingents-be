"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const model_constant_1 = __importDefault(require("../../constants/model/model.constant"));
const schemaOption_1 = require("../../constants/model/schemaOption");
const contentMetricsSnapshotSchema = new mongoose_1.Schema({
    user_id: Object.assign(Object.assign({}, model_constant_1.default.requiredObjectId), { ref: "users" }),
    posted_content_id: Object.assign(Object.assign({}, model_constant_1.default.requiredObjectId), { ref: "posted_contents" }),
    platform: {
        type: String,
        required: true,
        enum: ["facebook", "instagram", "youtube", "x"],
    },
    platform_post_id: model_constant_1.default.requiredString,
    snapshot_at: {
        type: Date,
        required: true,
        default: Date.now,
    },
    metrics: {
        views: { type: Number, default: 0 },
        likes: { type: Number, default: 0 },
        comments: { type: Number, default: 0 },
        shares: { type: Number, default: 0 },
        impressions: { type: Number, default: 0 },
        reach: { type: Number, default: 0 },
        watch_time_minutes: { type: Number, default: 0 },
        avg_view_duration: { type: Number, default: 0 },
        saves: { type: Number, default: 0 },
        retweets: { type: Number, default: 0 },
        quotes: { type: Number, default: 0 },
        bookmarks: { type: Number, default: 0 },
    },
}, Object.assign(Object.assign({}, schemaOption_1.GENERAL_SCHEMA_OPTIONS), { toJSON: { virtuals: true }, toObject: { virtuals: true } }));
contentMetricsSnapshotSchema.index({ posted_content_id: 1, snapshot_at: -1 });
contentMetricsSnapshotSchema.index({ user_id: 1, platform: 1, snapshot_at: -1 });
exports.default = contentMetricsSnapshotSchema;
