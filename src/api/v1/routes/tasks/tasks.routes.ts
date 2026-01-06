import { Router } from "express";
import {  createTask, deleteTask, getTasks, updateTaskStatus } from "../../controller/task/task.controller";
import { userAuth } from "../../middlewares/auth/userAuth";

const taskRouter = Router();

taskRouter.post("/create-task", userAuth, createTask);
taskRouter.get("/get-tasks", userAuth, getTasks);
taskRouter.patch("/update-task-status/:taskId", userAuth, updateTaskStatus);
taskRouter.delete("/delete-task/:taskId", userAuth, deleteTask);

export default taskRouter;
