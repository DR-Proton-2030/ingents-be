"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tagSchema = void 0;
const mongoose_1 = require("mongoose");
const schemaOption_1 = require("../../constants/model/schemaOption");
const model_constant_1 = __importDefault(require("../../constants/model/model.constant"));
exports.tagSchema = new mongoose_1.Schema({
    name: model_constant_1.default.requiredString,
    color: {
        type: String,
        required: true,
        default: "#3B82F6",
    },
    company_object_id: model_constant_1.default.requiredObjectId,
}, schemaOption_1.GENERAL_SCHEMA_OPTIONS);
