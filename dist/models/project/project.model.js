"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const project_schema_1 = require("./project.schema");
const ProjectModel = mongoose_1.default.model("Project", project_schema_1.projectSchema);
exports.default = ProjectModel;
