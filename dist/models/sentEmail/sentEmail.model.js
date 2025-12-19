"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const sentEmail_schema_1 = __importDefault(require("./sentEmail.schema"));
const SentEmailModel = (0, mongoose_1.model)("sent_emails", sentEmail_schema_1.default);
exports.default = SentEmailModel;
