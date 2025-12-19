"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const purchasedEmailTemplate_schema_1 = __importDefault(require("./purchasedEmailTemplate.schema"));
const PurchasedEmailTemplateModel = (0, mongoose_1.model)("purchased_email_templates", purchasedEmailTemplate_schema_1.default);
exports.default = PurchasedEmailTemplateModel;
