"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskSchema = void 0;
const mongoose_1 = require("mongoose");
const schemaOption_1 = require("../../constants/model/schemaOption");
const model_constant_1 = __importDefault(require("../../constants/model/model.constant"));
const taskStatus_1 = require("../../constants/taskStatus/taskStatus");
exports.taskSchema = new mongoose_1.Schema({
    title: model_constant_1.default.requiredString,
    completed: model_constant_1.default.requiredBoolean,
    description: model_constant_1.default.optionalNullString,
    parent_task_object_id: model_constant_1.default.optionalNullObjectId,
    due_date: model_constant_1.default.optionalNullDate,
    priority: model_constant_1.default.optionalNullString,
    progress: model_constant_1.default.requiredNumber,
    subtaskCount: model_constant_1.default.optionalNullNumber,
    commentCount: model_constant_1.default.optionalNullNumber,
    status: {
        type: String,
        enum: Object.values(taskStatus_1.TASK_STATUSES),
        default: taskStatus_1.TASK_STATUSES.PENDING,
    },
    completed_by_user_object_id: model_constant_1.default.optionalNullObjectId,
    completed_at: model_constant_1.default.optionalNullDate,
    created_by_user_object_id: model_constant_1.default.requiredObjectId,
    company_object_id: model_constant_1.default.requiredObjectId,
    assigned_user_list: {
        type: [
            {
                type: mongoose_1.Schema.Types.ObjectId,
                ref: "User",
            },
        ],
        default: [], // ✅ default must be HERE
    },
}, Object.assign(Object.assign({}, schemaOption_1.GENERAL_SCHEMA_OPTIONS), { toJSON: { virtuals: true }, toObject: { virtuals: true } }));
