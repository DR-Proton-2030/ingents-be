"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const scheduler_controller_1 = require("../../controller/scheduler/scheduler.controller");
const schedulerRouter = (0, express_1.Router)();
// Scheduled Posts Routes
schedulerRouter.post("/schedule", scheduler_controller_1.createScheduledPost);
schedulerRouter.post("/schedule/bulk", scheduler_controller_1.createBulkScheduledPosts);
schedulerRouter.get("/scheduled/:userId", scheduler_controller_1.getUserScheduledPosts);
schedulerRouter.get("/scheduled/post/:postId", scheduler_controller_1.getScheduledPostById);
schedulerRouter.put("/scheduled/:postId", scheduler_controller_1.updateScheduledPost);
schedulerRouter.put("/scheduled/:postId/reschedule", scheduler_controller_1.rescheduleExistingPost);
schedulerRouter.delete("/scheduled/:postId", scheduler_controller_1.cancelPost);
// Posted Content Routes
schedulerRouter.get("/posted/:userId", scheduler_controller_1.getUserPostedContent);
schedulerRouter.get("/posted/post/:postId", scheduler_controller_1.getPostedContentById);
// Queue Status (Admin)
schedulerRouter.get("/queue/status", scheduler_controller_1.getSchedulerQueueStatus);
exports.default = schedulerRouter;
