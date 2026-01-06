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
const assignedTask_model_1 = __importDefault(require("../../models/assignedTask/assignedTask.model"));
const getTaskService = (filter, startIndex, endIndex) => __awaiter(void 0, void 0, void 0, function* () {
    // Fetch all tasks matching the filter
    const allTasks = yield tasks_model_1.default.find(filter);
    // Build a map of tasks by _id for quick lookup
    const taskMap = {};
    for (const task of allTasks) {
        taskMap[String(task._id)] = Object.assign(Object.assign({}, task.toObject()), { subtask: [], assignees: [] });
    }
    const assignedTasks = yield assignedTask_model_1.default.find({
        task_object_id: { $in: allTasks.map(t => t._id) }
    })
        .populate("user_details", "full_name")
        .lean();
    // Map assignees to the expected object shape
    for (const assigned of assignedTasks) {
        const taskId = String(assigned.task_object_id);
        if (taskMap[taskId] && assigned.user_details) {
            const user = assigned.user_details;
            taskMap[taskId].assignees.push({
                _id: user._id,
                full_name: user.full_name,
                initials: user.full_name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase(),
                color: "", // AvatarGroup will generate a random color if empty
            });
        }
    }
    // Build the tree: assign each task to its parent's subtask array if it has a parent
    const rootTasks = [];
    for (const task of allTasks) {
        const taskId = String(task._id);
        const parentId = task.parent_task_object_id ? String(task.parent_task_object_id) : null;
        if (parentId && taskMap[parentId]) {
            taskMap[parentId].subtask.push(taskMap[taskId]);
        }
        else {
            rootTasks.push(taskMap[taskId]);
        }
    }
    // Apply pagination to the root tasks only
    const paginatedRootTasks = rootTasks.slice(startIndex, endIndex);
    return paginatedRootTasks;
});
exports.getTaskService = getTaskService;
