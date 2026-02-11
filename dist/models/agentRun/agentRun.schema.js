"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.agentRunSchema = void 0;
const mongoose_1 = require("mongoose");
const schemaOption_1 = require("../../constants/model/schemaOption");
const model_constant_1 = __importDefault(require("../../constants/model/model.constant"));
exports.agentRunSchema = new mongoose_1.Schema({
    goal: model_constant_1.default.requiredString,
    status: model_constant_1.default.requiredString,
    summary: model_constant_1.default.optionalNullString,
    steps: {
        type: [Object],
        default: [],
    },
    context: model_constant_1.default.optionalNullObject,
    error: model_constant_1.default.optionalNullObject,
    user_object_id: model_constant_1.default.requiredObjectId,
    company_object_id: model_constant_1.default.requiredObjectId,
    started_at: model_constant_1.default.optionalNullDate,
    finished_at: model_constant_1.default.optionalNullDate,
    metadata: model_constant_1.default.optionalNullObject,
}, Object.assign({}, schemaOption_1.GENERAL_SCHEMA_OPTIONS));
