"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const task_controller_1 = require("../../controller/task/task.controller");
const userAuth_1 = require("../../middlewares/auth/userAuth");
const multer_middleware_1 = require("../../middlewares/helper/multer/multer.middleware");
const fileUpload_helper_1 = require("../../middlewares/helper/fileUpload.helper");
const taskRouter = (0, express_1.Router)();
// Create task with optional file attachments (max 10 files)
taskRouter.post("/create-task", userAuth_1.userAuth, multer_middleware_1.upload.fields([{ name: "attachments", maxCount: 10 }]), fileUpload_helper_1.fileUploadHelper, task_controller_1.createTask);
taskRouter.get("/get-tasks", userAuth_1.userAuth, task_controller_1.getTasks);
taskRouter.patch("/update-task-status/:taskId", userAuth_1.userAuth, task_controller_1.updateTaskStatus);
// Update task with optional file attachments (max 10 files)
taskRouter.patch("/update-task/:taskId", userAuth_1.userAuth, multer_middleware_1.upload.fields([{ name: "attachments", maxCount: 10 }]), fileUpload_helper_1.fileUploadHelper, task_controller_1.editTask);
taskRouter.delete("/delete-task/:taskId", userAuth_1.userAuth, task_controller_1.deleteTask);
taskRouter.delete("/unassign/:taskId/:userId", userAuth_1.userAuth, task_controller_1.unassignTaskFromUser);
taskRouter.post("/assign/:taskId/:userId", userAuth_1.userAuth, task_controller_1.assignTaskToUser);
exports.default = taskRouter;
