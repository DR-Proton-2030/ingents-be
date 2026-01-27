"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTaskService = void 0;
const tasks_model_1 = __importDefault(require("../../models/tasks/tasks.model"));
const getTaskService = (filter_1, startIndex_1, endIndex_1, ...args_1) => __awaiter(void 0, [filter_1, startIndex_1, endIndex_1, ...args_1], void 0, function* (filter, startIndex, endIndex, sortOptions = {}) {
    // 1️⃣ Fetch tasks WITH populated assigned users, phase info, and tags
    const allTasks = yield tasks_model_1.default.find(filter)
        .populate("assigned_users_info", "full_name email profile_picture")
        .populate("phase_info")
        .populate("tags_info")
        .sort(sortOptions)
        .lean();
    // 2️⃣ Build map
    const taskMap = {};
    for (const task of allTasks) {
        taskMap[String(task._id)] = Object.assign(Object.assign({}, task), { subtask: [], assignees: task.assigned_users_info || [] });
    }
    // 3️⃣ Build parent → subtask tree
    const rootTasks = [];
    for (const task of allTasks) {
        const taskId = String(task._id);
        const parentId = task.parent_task_object_id
            ? String(task.parent_task_object_id)
            : null;
        if (parentId && taskMap[parentId]) {
            taskMap[parentId].subtask.push(taskMap[taskId]);
        }
        else {
            rootTasks.push(taskMap[taskId]);
        }
    }
    // 4️⃣ Pagination on root tasks only
    return rootTasks.slice(startIndex, endIndex);
});
exports.getTaskService = getTaskService;
