"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const model_constant_1 = __importDefault(require("../../constants/model/model.constant"));
const schemaOption_1 = require("../../constants/model/schemaOption");
const attendanceSchema = new mongoose_1.Schema({
    user_object_id: Object.assign(Object.assign({}, model_constant_1.default.requiredObjectId), { ref: "users" }),
    company_object_id: model_constant_1.default.requiredObjectId,
    date: model_constant_1.default.requiredString,
}, Object.assign({}, schemaOption_1.GENERAL_SCHEMA_OPTIONS));
// Indexes to speed up queries by company/user and date
attendanceSchema.index({ company_object_id: 1, date: -1 });
attendanceSchema.index({ user_object_id: 1, date: 1 }, { unique: true });
exports.default = attendanceSchema;
