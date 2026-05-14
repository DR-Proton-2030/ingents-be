"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiTokenUsageSchema = void 0;
const mongoose_1 = require("mongoose");
const model_constant_1 = __importDefault(require("../../constants/model/model.constant"));
const schemaOption_1 = require("../../constants/model/schemaOption");
exports.aiTokenUsageSchema = new mongoose_1.Schema({
    company_object_id: model_constant_1.default.requiredObjectId,
    user_object_id: model_constant_1.default.requiredObjectId,
    feature: model_constant_1.default.requiredString,
    tokens_used: { type: Number, required: true, default: 0 },
    prompt_tokens: { type: Number, required: true, default: 0 },
    completion_tokens: { type: Number, required: true, default: 0 },
}, Object.assign(Object.assign({}, schemaOption_1.GENERAL_SCHEMA_OPTIONS), { toJSON: { virtuals: true }, toObject: { virtuals: true } }));
