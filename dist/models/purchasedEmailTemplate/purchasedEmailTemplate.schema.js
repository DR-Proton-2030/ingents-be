"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const model_constant_1 = __importDefault(require("../../constants/model/model.constant"));
const schemaOption_1 = require("../../constants/model/schemaOption");
const purchasedEmailTemplateSchema = new mongoose_1.Schema({
    buyer_id: model_constant_1.default.requiredString,
    purchased_quota: model_constant_1.default.requiredNumber,
    quota_left: model_constant_1.default.requiredNumber,
}, Object.assign(Object.assign({}, schemaOption_1.GENERAL_SCHEMA_OPTIONS), { toJSON: { virtuals: true }, toObject: { virtuals: true } }));
exports.default = purchasedEmailTemplateSchema;
