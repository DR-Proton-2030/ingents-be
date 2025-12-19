"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const model_constant_1 = __importDefault(require("../../constants/model/model.constant"));
const schemaOption_1 = require("../../constants/model/schemaOption");
const sentEmailSchema = new mongoose_1.Schema({
    MSG_id: model_constant_1.default.requiredString,
    company_id: model_constant_1.default.requiredString,
    user_id: model_constant_1.default.requiredString,
    quota_used: model_constant_1.default.requiredString,
    email_body: model_constant_1.default.requiredString,
    email_subject: model_constant_1.default.requiredString,
    purchased_email_template_id: model_constant_1.default.requiredString,
}, Object.assign(Object.assign({}, schemaOption_1.GENERAL_SCHEMA_OPTIONS), { toJSON: { virtuals: true }, toObject: { virtuals: true } }));
exports.default = sentEmailSchema;
