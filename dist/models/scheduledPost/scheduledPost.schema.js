"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const model_constant_1 = __importDefault(require("../../constants/model/model.constant"));
const schemaOption_1 = require("../../constants/model/schemaOption");
const scheduledPostSchema = new mongoose_1.Schema({
    user_id: Object.assign(Object.assign({}, model_constant_1.default.requiredObjectId), { ref: "users" }),
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
    scheduled_at: model_constant_1.default.requiredDate,
    status: {
        type: String,
        enum: ["pending", "processing", "completed", "failed", "cancelled"],
        default: "pending",
    },
    job_id: model_constant_1.default.optionalNullString,
    page_id: model_constant_1.default.optionalNullString,
    channel_id: model_constant_1.default.optionalNullString,
    platform_specific_data: {
        type: mongoose_1.Schema.Types.Mixed,
        default: {},
    },
    error_message: model_constant_1.default.optionalNullString,
    retry_count: {
        type: Number,
        default: 0,
    },
    max_retries: {
        type: Number,
        default: 3,
    },
}, Object.assign(Object.assign({}, schemaOption_1.GENERAL_SCHEMA_OPTIONS), { toJSON: { virtuals: true }, toObject: { virtuals: true } }));
// Index for efficient querying
scheduledPostSchema.index({ user_id: 1, status: 1 });
scheduledPostSchema.index({ scheduled_at: 1, status: 1 });
scheduledPostSchema.index({ job_id: 1 });
exports.default = scheduledPostSchema;
