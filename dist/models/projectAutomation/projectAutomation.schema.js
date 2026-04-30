"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectAutomationSchema = void 0;
const mongoose_1 = require("mongoose");
const model_constant_1 = __importDefault(require("../../constants/model/model.constant"));
const schemaOption_1 = require("../../constants/model/schemaOption");
exports.projectAutomationSchema = new mongoose_1.Schema({
    project_object_id: model_constant_1.default.requiredObjectId,
    company_object_id: model_constant_1.default.requiredObjectId,
    created_by_user_object_id: model_constant_1.default.requiredObjectId,
    automation_type: model_constant_1.default.requiredString,
    is_active: model_constant_1.default.optionalBoolean,
    project_context: model_constant_1.default.requiredString,
    github_repo_owner: model_constant_1.default.requiredString,
    github_repo_name: model_constant_1.default.requiredString,
    github_webhook_secret: model_constant_1.default.requiredString,
    trello_list_id: model_constant_1.default.requiredString,
}, Object.assign({}, schemaOption_1.GENERAL_SCHEMA_OPTIONS));
exports.projectAutomationSchema.index({ project_object_id: 1, automation_type: 1 }, { unique: true });
