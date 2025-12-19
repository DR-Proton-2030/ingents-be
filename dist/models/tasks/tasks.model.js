"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const tasks_schema_1 = require("./tasks.schema");
const TaskModel = (0, mongoose_1.model)("tasks", tasks_schema_1.taskSchema);
exports.default = TaskModel;
