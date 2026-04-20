"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.campaignSchema = void 0;
const mongoose_1 = require("mongoose");
const schemaOption_1 = require("../../constants/model/schemaOption");
const model_constant_1 = __importDefault(require("../../constants/model/model.constant"));
exports.campaignSchema = new mongoose_1.Schema({
    name: model_constant_1.default.requiredString,
    type: {
        type: String,
        enum: ["social_broadcaster", "whatsapp_messenger"],
        required: true,
    },
    message_content: {
        type: String,
    },
    frequency: {
        type: String,
        enum: ["once", "recurring"],
        required: true,
    },
    recurring_days: {
        type: [String],
        default: [],
    },
    scheduled_time: {
        type: String,
    },
    target_numbers: {
        type: [String],
        default: [],
    },
    ai_context: {
        type: String,
    },
    use_ai_generation: {
        type: Boolean,
        default: false,
    },
    status: {
        type: String,
        enum: ["active", "draft", "paused", "completed"],
        default: "active",
    },
    created_by_user_object_id: model_constant_1.default.requiredObjectId,
    company_object_id: model_constant_1.default.requiredObjectId,
}, Object.assign(Object.assign({}, schemaOption_1.GENERAL_SCHEMA_OPTIONS), { toJSON: { virtuals: true }, toObject: { virtuals: true } }));
