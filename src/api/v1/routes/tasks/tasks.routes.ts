import { Router } from "express";
import {   assignTaskToUser, createTask, deleteTask, editTask, getTasks, unassignTaskFromUser, updateTaskStatus } from "../../controller/task/task.controller";
import { userAuth } from "../../middlewares/auth/userAuth";

const taskRouter = Router();

taskRouter.post("/create-task", userAuth, createTask);
taskRouter.get("/get-tasks", userAuth, getTasks);
taskRouter.patch("/update-task-status/:taskId", userAuth, updateTaskStatus);
taskRouter.patch("/update-task/:taskId", userAuth, editTask);
taskRouter.delete("/delete-task/:taskId", userAuth, deleteTask);
taskRouter.delete(
  "/unassign/:taskId/:userId",
  userAuth,
  unassignTaskFromUser
);
taskRouter.post(
  "/assign/:taskId/:userId",
  userAuth,
  assignTaskToUser
);

export default taskRouter;
