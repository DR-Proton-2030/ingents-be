"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const assignedTask_schema_1 = require("./assignedTask.schema");
const AssignedTaskModel = (0, mongoose_1.model)("assigned_tasks", assignedTask_schema_1.assignedTaskSchema);
exports.default = AssignedTaskModel;
