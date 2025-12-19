"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const CompanySettings_schema_1 = __importDefault(require("./CompanySettings.schema"));
const CompanySettingsModel = (0, mongoose_1.model)("company_settings", CompanySettings_schema_1.default);
exports.default = CompanySettingsModel;
