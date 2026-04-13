import { Router } from "express";
import { getTodos, createTodo, updateTodo, deleteTodo } from "../../controller/todo/todo.controller";
import { userAuth } from "../../middlewares/auth/userAuth";

const todoRouter = Router();

todoRouter.get("/get-todos", userAuth, getTodos);
todoRouter.post("/create-todo", userAuth, createTodo);
todoRouter.patch("/update-todo", userAuth, updateTodo);
todoRouter.delete("/delete-todo/:id", userAuth, deleteTodo);

export default todoRouter;
