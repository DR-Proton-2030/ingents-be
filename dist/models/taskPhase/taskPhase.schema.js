"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const model_constant_1 = __importDefault(require("../../constants/model/model.constant"));
const schemaOption_1 = require("../../constants/model/schemaOption");
const taskPhaseSchema = new mongoose_1.Schema({
    name: model_constant_1.default.requiredString,
    index: model_constant_1.default.requiredNumber,
    company_object_id: model_constant_1.default.requiredObjectId,
    is_default: Object.assign(Object.assign({}, model_constant_1.default.requiredBoolean), { default: false }),
    color: model_constant_1.default.optionalNullString,
}, Object.assign(Object.assign({}, schemaOption_1.GENERAL_SCHEMA_OPTIONS), { toJSON: { virtuals: true }, toObject: { virtuals: true } }));
// Index for efficient queries
taskPhaseSchema.index({ company_object_id: 1, index: 1 });
taskPhaseSchema.index({ company_object_id: 1, is_default: 1 });
exports.default = taskPhaseSchema;
