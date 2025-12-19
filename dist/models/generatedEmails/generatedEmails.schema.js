"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatedEmailsSchema = void 0;
const mongoose_1 = require("mongoose");
const model_constant_1 = __importDefault(require("../../constants/model/model.constant"));
const schemaOption_1 = require("../../constants/model/schemaOption");
exports.generatedEmailsSchema = new mongoose_1.Schema({
    userId: model_constant_1.default.requiredObjectId,
    uploaded_company_id: model_constant_1.default.requiredString,
    email_sub: model_constant_1.default.requiredString,
    email_body: model_constant_1.default.requiredString,
    date: { type: Date, default: Date.now }
}, Object.assign(Object.assign({}, schemaOption_1.GENERAL_SCHEMA_OPTIONS), { toJSON: { virtuals: true }, toObject: { virtuals: true } }));
