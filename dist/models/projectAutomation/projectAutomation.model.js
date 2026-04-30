"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const projectAutomation_schema_1 = require("./projectAutomation.schema");
const ProjectAutomationModel = mongoose_1.default.model("project_automations", projectAutomation_schema_1.projectAutomationSchema);
exports.default = ProjectAutomationModel;
