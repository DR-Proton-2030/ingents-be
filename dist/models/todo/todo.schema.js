"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const model_constant_1 = __importDefault(require("../../constants/model/model.constant"));
const schemaOption_1 = require("../../constants/model/schemaOption");
const todoSchema = new mongoose_1.Schema({
    user_object_id: model_constant_1.default.requiredObjectId,
    company_object_id: model_constant_1.default.requiredObjectId,
    text: model_constant_1.default.requiredString,
    completed: model_constant_1.default.optionalBoolean,
    date: model_constant_1.default.requiredString, // YYYY-MM-DD
}, Object.assign({}, schemaOption_1.GENERAL_SCHEMA_OPTIONS));
todoSchema.index({ user_object_id: 1, date: 1 });
exports.default = todoSchema;
