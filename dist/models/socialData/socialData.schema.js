"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const model_constant_1 = __importDefault(require("../../constants/model/model.constant"));
const schemaOption_1 = require("../../constants/model/schemaOption");
const socialDataSchema = new mongoose_1.Schema({
    user_object_id: Object.assign(Object.assign({}, model_constant_1.default.requiredObjectId), { ref: "users" }),
    platform_name: Object.assign(Object.assign({}, model_constant_1.default.requiredString), { enum: ["youtube", "facebook", "x", "instagram"] }),
    platform_id: model_constant_1.default.requiredString,
    data: {
        type: mongoose_1.Schema.Types.Mixed,
        required: true,
    },
    is_active: model_constant_1.default.optionalBoolean,
    last_synced_at: model_constant_1.default.optionalNullDate,
}, Object.assign(Object.assign({}, schemaOption_1.GENERAL_SCHEMA_OPTIONS), { discriminatorKey: "platform_name", toJSON: { virtuals: true }, toObject: { virtuals: true } }));
socialDataSchema.index({ user_object_id: 1, platform_name: 1 }, { unique: true });
socialDataSchema.index({ platform_id: 1 });
exports.default = socialDataSchema;
