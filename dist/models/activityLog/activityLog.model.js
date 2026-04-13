"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const activityLog_schema_1 = __importDefault(require("./activityLog.schema"));
const ActivityLogModel = (0, mongoose_1.model)("activity_logs", activityLog_schema_1.default);
exports.default = ActivityLogModel;
