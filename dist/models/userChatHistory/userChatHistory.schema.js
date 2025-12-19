"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userChatHistorySchema = void 0;
const mongoose_1 = require("mongoose");
const model_constant_1 = __importDefault(require("../../constants/model/model.constant"));
const schemaOption_1 = require("../../constants/model/schemaOption");
exports.userChatHistorySchema = new mongoose_1.Schema({
    userId: model_constant_1.default.requiredObjectId,
    uploaded_company_id: model_constant_1.default.requiredObjectId,
    messages: [
        {
            role: {
                type: String,
                enum: ["user", "system"],
                required: true
            },
            request: model_constant_1.default.requiredString,
            response: model_constant_1.default.requiredString,
        }
    ]
}, Object.assign(Object.assign({}, schemaOption_1.GENERAL_SCHEMA_OPTIONS), { toJSON: { virtuals: true }, toObject: { virtuals: true } }));
