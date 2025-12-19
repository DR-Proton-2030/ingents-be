"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const model_constant_1 = __importDefault(require("../../constants/model/model.constant"));
const schemaOption_1 = require("../../constants/model/schemaOption");
const companySchema = new mongoose_1.Schema({
    company_name: model_constant_1.default.requiredString,
    website: model_constant_1.default.requiredString,
    logo: model_constant_1.default.optionalNullString,
    address: model_constant_1.default.optionalNullString,
    phone_number: model_constant_1.default.requiredString,
    industry: model_constant_1.default.optionalNullString,
    company_size: model_constant_1.default.optionalNullString,
    contact_email: model_constant_1.default.optionalNullString,
    founding_year: model_constant_1.default.optionalNullNumber,
    description: model_constant_1.default.optionalNullString,
    products: model_constant_1.default.optionalArray,
    sector: model_constant_1.default.optionalNullString,
    services: model_constant_1.default.optionalArray,
}, Object.assign(Object.assign({}, schemaOption_1.GENERAL_SCHEMA_OPTIONS), { toJSON: { virtuals: true }, toObject: { virtuals: true } }));
exports.default = companySchema;
