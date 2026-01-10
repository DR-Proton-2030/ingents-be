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
exports.unassignTaskFromUser = exports.deleteTask = exports.updateTaskStatus = exports.getTasks = exports.createTask = void 0;
const tasks_model_1 = __importDefault(require("../../../../models/tasks/tasks.model"));
const getTask_1 = require("../../../../services/tasks/getTask");
const assignedTask_model_1 = __importDefault(require("../../../../models/assignedTask/assignedTask.model"));
const mongoose_1 = __importDefault(require("mongoose"));
const taskStatus_1 = require("../../../../constants/taskStatus/taskStatus");
const createTask = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const session = yield mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const { title, completed = false, description = "", parent_task_object_id = null, due_date = null, priority = "Normal", status = "pending", assigned_user_list, } = req.body;
        const { _id: user_object_id, company_object_id } = req.user;
        // Parse assigned_user_list safely
        let parsedAssignedUsers = [];
        if (Array.isArray(assigned_user_list)) {
            parsedAssignedUsers = assigned_user_list;
        }
        else if (typeof assigned_user_list === "string") {
            try {
                const parsed = JSON.parse(assigned_user_list);
                parsedAssignedUsers = Array.isArray(parsed) ? parsed : [parsed];
            }
            catch (_a) {
                parsedAssignedUsers = [assigned_user_list];
            }
        }
        // Create Task
        const newTaskPayload = {
            title,
            completed,
            description,
            parent_task_object_id,
            due_date,
            priority,
            progress: 0,
            status,
            created_by_user_object_id: user_object_id,
            company_object_id: company_object_id,
            assigned_user_list: parsedAssignedUsers,
        };
        const newTask = yield new tasks_model_1.default(newTaskPayload).save({ session });
        // Create Assigned Task entries
        if (parsedAssignedUsers.length > 0) {
            const assignedTasks = parsedAssignedUsers.map((uid) => ({
                task_object_id: newTask._id,
                assigned_to_user_object_id: uid,
                assigned_by_user_object_id: user_object_id,
                company_object_id: company_object_id,
                assigned_at: new Date(),
            }));
            yield assignedTask_model_1.default.insertMany(assignedTasks, { session });
        }
        yield session.commitTransaction();
        // Populate assigned users using virtual (full_name only)
        const assignedTasks = yield assignedTask_model_1.default.find({ task_object_id: newTask._id })
            .populate("user_details", "full_name") // use virtual
            .lean();
        const responseTask = Object.assign(Object.assign({}, newTask.toObject()), { assignedTasks });
        res.status(201).json({
            message: "Task created successfully",
            data: responseTask,
        });
    }
    catch (error) {
        if (session.inTransaction())
            yield session.abortTransaction();
        console.error("Create Task Error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
    finally {
        session.endSession();
    }
});
exports.createTask = createTask;
const getTasks = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { company_object_id } = req.user;
        const { page, limit } = req.query;
        const startIndex = ((Number(page) || 1) - 1) * (Number(limit) || 10);
        const endIndex = startIndex + (Number(limit) || 10);
        const tasks = yield (0, getTask_1.getTaskService)({ company_object_id: company_object_id }, startIndex, endIndex);
        res
            .status(200)
            .json({ message: "Tasks fetched successfully", data: tasks });
    }
    catch (error) {
        res.status(500).json({ message: "Internal server error", error });
    }
});
exports.getTasks = getTasks;
const updateTaskStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { taskId } = req.params;
        const { status } = req.body;
        if (!Object.values(taskStatus_1.TASK_STATUSES).includes(status)) {
            return res.status(400).json({
                message: "Invalid task status",
                allowedStatuses: Object.values(taskStatus_1.TASK_STATUSES),
            });
        }
        const task = yield tasks_model_1.default.findByIdAndUpdate(taskId, { status }, { new: true });
        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }
        return res.status(200).json({
            message: "Task status updated",
            task,
        });
    }
    catch (error) {
        console.error("Update task status error:", error);
        return res.status(500).json({ message: "Server error" });
    }
});
exports.updateTaskStatus = updateTaskStatus;
const deleteTask = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { taskId } = req.params;
        const task = yield tasks_model_1.default.findByIdAndDelete(taskId);
        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }
        return res.status(200).json({
            message: "Task deleted successfully",
        });
    }
    catch (error) {
        console.error("Delete task error:", error);
        return res.status(500).json({ message: "Server error" });
    }
});
exports.deleteTask = deleteTask;
const unassignTaskFromUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const session = yield mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const { taskId, userId } = req.params;
        const { company_object_id } = req.user;
        if (!taskId || !userId) {
            return res.status(400).json({
                message: "taskId and userId are required",
            });
        }
        // 1️⃣ Ensure task exists & belongs to company
        const task = yield tasks_model_1.default.findOne({
            _id: taskId,
            company_object_id,
        }).session(session);
        if (!task) {
            return res.status(404).json({
                message: "Task not found",
            });
        }
        // 2️⃣ Remove user from task.assigned_user_list
        yield tasks_model_1.default.updateOne({ _id: taskId }, { $pull: { assigned_user_list: userId } }, { session });
        // 3️⃣ Delete assigned task record
        yield assignedTask_model_1.default.deleteOne({
            task_object_id: taskId,
            assigned_to_user_object_id: userId,
            company_object_id,
        }, { session });
        yield session.commitTransaction();
        return res.status(200).json({
            message: "User unassigned from task successfully",
        });
    }
    catch (error) {
        if (session.inTransaction()) {
            yield session.abortTransaction();
        }
        console.error("Unassign Task Error:", error);
        return res.status(500).json({
            message: "Internal server error",
        });
    }
    finally {
        session.endSession();
    }
});
exports.unassignTaskFromUser = unassignTaskFromUser;
