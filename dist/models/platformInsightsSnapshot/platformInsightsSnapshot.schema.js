"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const model_constant_1 = __importDefault(require("../../constants/model/model.constant"));
const schemaOption_1 = require("../../constants/model/schemaOption");
const platformInsightsSnapshotSchema = new mongoose_1.Schema({
    user_id: Object.assign(Object.assign({}, model_constant_1.default.requiredObjectId), { ref: "users" }),
    platform: {
        type: String,
        required: true,
        enum: ["facebook", "instagram", "youtube", "x"],
    },
    snapshot_at: {
        type: Date,
        required: true,
        default: Date.now,
    },
    account_metrics: {
        followers: { type: Number, default: 0 },
        total_views: { type: Number, default: 0 },
        total_posts: { type: Number, default: 0 },
        profile_views: { type: Number, default: 0 },
    },
    period_metrics: {
        new_followers: { type: Number, default: 0 },
        lost_followers: { type: Number, default: 0 },
        impressions: { type: Number, default: 0 },
        reach: { type: Number, default: 0 },
        engagement_rate: { type: Number, default: 0 },
    },
}, Object.assign(Object.assign({}, schemaOption_1.GENERAL_SCHEMA_OPTIONS), { toJSON: { virtuals: true }, toObject: { virtuals: true } }));
platformInsightsSnapshotSchema.index({ user_id: 1, platform: 1, snapshot_at: -1 });
exports.default = platformInsightsSnapshotSchema;
