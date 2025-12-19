"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const model_constant_1 = __importDefault(require("../../constants/model/model.constant"));
const schemaOption_1 = require("../../constants/model/schemaOption");
const companySettingsSchema = new mongoose_1.Schema({
    company_object_id: model_constant_1.default.requiredObjectId,
    agents: model_constant_1.default.optionalArray,
    content: model_constant_1.default.optionalNullString,
    embedding: model_constant_1.default.optionalArray,
    language: model_constant_1.default.optionalNullString,
    tags: model_constant_1.default.optionalArray,
    metadata: {
        type: mongoose_1.Schema.Types.Mixed,
        required: false,
        default: {}
    },
}, Object.assign(Object.assign({}, schemaOption_1.GENERAL_SCHEMA_OPTIONS), { toJSON: { virtuals: true }, toObject: { virtuals: true } }));
exports.default = companySettingsSchema;
