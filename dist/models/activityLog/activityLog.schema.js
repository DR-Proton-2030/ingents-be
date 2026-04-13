"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const model_constant_1 = __importDefault(require("../../constants/model/model.constant"));
const schemaOption_1 = require("../../constants/model/schemaOption");
const activityLogSchema = new mongoose_1.Schema({
    company_object_id: model_constant_1.default.requiredObjectId,
    actor_object_id: model_constant_1.default.requiredObjectId,
    actor_name: model_constant_1.default.requiredString,
    activity_type: model_constant_1.default.requiredString,
    message: model_constant_1.default.requiredString,
    metadata: model_constant_1.default.optionalNullObject,
}, Object.assign({}, schemaOption_1.GENERAL_SCHEMA_OPTIONS));
activityLogSchema.index({ company_object_id: 1, createdAt: -1 });
exports.default = activityLogSchema;
