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
exports.getTasks = exports.createTeask = void 0;
const tasks_model_1 = __importDefault(require("../../../../models/tasks/tasks.model"));
const getTask_1 = require("../../../../services/tasks/getTask");
const assignedTask_model_1 = __importDefault(require("../../../../models/assignedTask/assignedTask.model"));
const createTeask = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const session = yield tasks_model_1.default.db.startSession();
    session.startTransaction();
    try {
        const { title, completed, description, parent_task_object_id, due_date, priority, status, assigned_user_list, } = req.body;
        const { _id: user_object_id, company_object_id } = req.user;
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
        };
        const newTask = new tasks_model_1.default(newTaskPayload);
        const assignedTaskList = [];
        if (assigned_user_list && assigned_user_list.length > 0) {
            for (const assignedUserId of assigned_user_list) {
                const assignTaskPayload = {
                    task_object_id: newTask._id,
                    assigned_to_user_object_id: assignedUserId,
                    company_object_id: company_object_id,
                    assigned_by_user_object_id: user_object_id,
                    assigned_at: new Date(),
                };
                assignedTaskList.push(assignTaskPayload);
            }
        }
        yield newTask.save({ session });
        if (assignedTaskList.length > 0) {
            yield assignedTask_model_1.default.insertMany(assignedTaskList, { session });
        }
        yield session.commitTransaction();
        res
            .status(201)
            .json({ message: "Task created successfully", data: newTask });
    }
    catch (error) {
        if (session.inTransaction())
            yield session.abortTransaction();
        res.status(500).json({ message: "Internal server error", error });
    }
    finally {
        session.endSession();
    }
});
exports.createTeask = createTeask;
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
