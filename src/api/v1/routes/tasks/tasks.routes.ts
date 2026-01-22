import { Router } from "express";
import {   assignTaskToUser, createTask, deleteTask, editTask, getTasks, unassignTaskFromUser, updateTaskStatus } from "../../controller/task/task.controller";
import { userAuth } from "../../middlewares/auth/userAuth";
import { upload } from "../../middlewares/helper/multer/multer.middleware";
import { fileUploadHelper } from "../../middlewares/helper/fileUpload.helper";

const taskRouter = Router();

// Create task with optional file attachments (max 10 files)
taskRouter.post(
  "/create-task",
  userAuth,
  upload.fields([{ name: "attachments", maxCount: 10 }]),
  fileUploadHelper,
  createTask
);
taskRouter.get("/get-tasks", userAuth, getTasks);
taskRouter.patch("/update-task-status/:taskId", userAuth, updateTaskStatus);

// Update task with optional file attachments (max 10 files)
taskRouter.patch(
  "/update-task/:taskId",
  userAuth,
  upload.fields([{ name: "attachments", maxCount: 10 }]),
  fileUploadHelper,
  editTask
);
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
