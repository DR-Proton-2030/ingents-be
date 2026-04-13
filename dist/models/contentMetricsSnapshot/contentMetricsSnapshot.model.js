"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const contentMetricsSnapshot_schema_1 = __importDefault(require("./contentMetricsSnapshot.schema"));
const ContentMetricsSnapshotModel = (0, mongoose_1.model)("content_metrics_snapshots", contentMetricsSnapshot_schema_1.default);
exports.default = ContentMetricsSnapshotModel;
