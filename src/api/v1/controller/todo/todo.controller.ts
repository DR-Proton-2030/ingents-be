import { Request, Response } from "express";
import TodoModel from "../../../../models/todo/todo.model";

// GET /api/v1/todos/get-todos?date=YYYY-MM-DD
export const getTodos = async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ message: "date query param is required (YYYY-MM-DD)" });
    }

    const todos = await TodoModel.find({
      user_object_id: user._id,
      date: date as string,
    }).sort({ createdAt: 1 });

    return res.status(200).json({ message: "Todos fetched", data: todos });
  } catch (error: any) {
    console.error("getTodos error:", error);
    return res.status(500).json({ message: "Failed to fetch todos", error: error.message });
  }
};

// POST /api/v1/todos/create-todo
export const createTodo = async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { text, date } = req.body;

    if (!text || !date) {
      return res.status(400).json({ message: "text and date are required" });
    }

    const todo = await TodoModel.create({
      user_object_id: user._id,
      company_object_id: user.company_object_id,
      text,
      date,
      completed: false,
    });

    return res.status(201).json({ message: "Todo created", data: todo });
  } catch (error: any) {
    console.error("createTodo error:", error);
    return res.status(500).json({ message: "Failed to create todo", error: error.message });
  }
};

// PATCH /api/v1/todos/update-todo
export const updateTodo = async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { todoId, text, completed } = req.body;

    if (!todoId) {
      return res.status(400).json({ message: "todoId is required" });
    }

    const todo = await TodoModel.findOne({ _id: todoId, user_object_id: user._id });
    if (!todo) {
      return res.status(404).json({ message: "Todo not found" });
    }

    const updatePayload: any = {};
    if (text !== undefined) updatePayload.text = text;
    if (completed !== undefined) updatePayload.completed = completed;

    const updated = await TodoModel.findByIdAndUpdate(todoId, { $set: updatePayload }, { new: true });
    return res.status(200).json({ message: "Todo updated", data: updated });
  } catch (error: any) {
    console.error("updateTodo error:", error);
    return res.status(500).json({ message: "Failed to update todo", error: error.message });
  }
};

// DELETE /api/v1/todos/delete-todo/:id
export const deleteTodo = async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "Todo id is required" });
    }

    const todo = await TodoModel.findOne({ _id: id, user_object_id: user._id });
    if (!todo) {
      return res.status(404).json({ message: "Todo not found" });
    }

    await TodoModel.findByIdAndDelete(id);
    return res.status(200).json({ message: "Todo deleted" });
  } catch (error: any) {
    console.error("deleteTodo error:", error);
    return res.status(500).json({ message: "Failed to delete todo", error: error.message });
  }
};
