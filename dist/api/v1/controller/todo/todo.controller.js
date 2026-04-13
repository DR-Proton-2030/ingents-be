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
exports.deleteTodo = exports.updateTodo = exports.createTodo = exports.getTodos = void 0;
const todo_model_1 = __importDefault(require("../../../../models/todo/todo.model"));
// GET /api/v1/todos/get-todos?date=YYYY-MM-DD
const getTodos = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.user;
        const { date } = req.query;
        if (!date) {
            return res.status(400).json({ message: "date query param is required (YYYY-MM-DD)" });
        }
        const todos = yield todo_model_1.default.find({
            user_object_id: user._id,
            date: date,
        }).sort({ createdAt: 1 });
        return res.status(200).json({ message: "Todos fetched", data: todos });
    }
    catch (error) {
        console.error("getTodos error:", error);
        return res.status(500).json({ message: "Failed to fetch todos", error: error.message });
    }
});
exports.getTodos = getTodos;
// POST /api/v1/todos/create-todo
const createTodo = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.user;
        const { text, date } = req.body;
        if (!text || !date) {
            return res.status(400).json({ message: "text and date are required" });
        }
        const todo = yield todo_model_1.default.create({
            user_object_id: user._id,
            company_object_id: user.company_object_id,
            text,
            date,
            completed: false,
        });
        return res.status(201).json({ message: "Todo created", data: todo });
    }
    catch (error) {
        console.error("createTodo error:", error);
        return res.status(500).json({ message: "Failed to create todo", error: error.message });
    }
});
exports.createTodo = createTodo;
// PATCH /api/v1/todos/update-todo
const updateTodo = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.user;
        const { todoId, text, completed } = req.body;
        if (!todoId) {
            return res.status(400).json({ message: "todoId is required" });
        }
        const todo = yield todo_model_1.default.findOne({ _id: todoId, user_object_id: user._id });
        if (!todo) {
            return res.status(404).json({ message: "Todo not found" });
        }
        const updatePayload = {};
        if (text !== undefined)
            updatePayload.text = text;
        if (completed !== undefined)
            updatePayload.completed = completed;
        const updated = yield todo_model_1.default.findByIdAndUpdate(todoId, { $set: updatePayload }, { new: true });
        return res.status(200).json({ message: "Todo updated", data: updated });
    }
    catch (error) {
        console.error("updateTodo error:", error);
        return res.status(500).json({ message: "Failed to update todo", error: error.message });
    }
});
exports.updateTodo = updateTodo;
// DELETE /api/v1/todos/delete-todo/:id
const deleteTodo = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.user;
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ message: "Todo id is required" });
        }
        const todo = yield todo_model_1.default.findOne({ _id: id, user_object_id: user._id });
        if (!todo) {
            return res.status(404).json({ message: "Todo not found" });
        }
        yield todo_model_1.default.findByIdAndDelete(id);
        return res.status(200).json({ message: "Todo deleted" });
    }
    catch (error) {
        console.error("deleteTodo error:", error);
        return res.status(500).json({ message: "Failed to delete todo", error: error.message });
    }
});
exports.deleteTodo = deleteTodo;
