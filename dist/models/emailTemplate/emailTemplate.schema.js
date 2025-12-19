"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const model_constant_1 = __importDefault(require("../../constants/model/model.constant"));
const schemaOption_1 = require("../../constants/model/schemaOption");
const emailTemplateSchema = new mongoose_1.Schema({
    template_name: model_constant_1.default.requiredString,
    category: model_constant_1.default.requiredString,
    price: model_constant_1.default.requiredString,
    created_by: model_constant_1.default.requiredString,
    privet: model_constant_1.default.requiredString,
    body: model_constant_1.default.requiredString,
    subject: model_constant_1.default.requiredString,
}, Object.assign(Object.assign({}, schemaOption_1.GENERAL_SCHEMA_OPTIONS), { toJSON: { virtuals: true }, toObject: { virtuals: true } }));
exports.default = emailTemplateSchema;
