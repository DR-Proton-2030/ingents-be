import { Router } from "express";
import {
  createScheduledPost,
  getUserScheduledPosts,
  getScheduledPostById,
  cancelPost,
  rescheduleExistingPost,
  updateScheduledPost,
  getUserPostedContent,
  getPostedContentById,
  getSchedulerQueueStatus,
  createBulkScheduledPosts,
} from "../../controller/scheduler/scheduler.controller";

const schedulerRouter = Router();

// Scheduled Posts Routes
schedulerRouter.post("/schedule", createScheduledPost);
schedulerRouter.post("/schedule/bulk", createBulkScheduledPosts);
schedulerRouter.get("/scheduled/:userId", getUserScheduledPosts);
schedulerRouter.get("/scheduled/post/:postId", getScheduledPostById);
schedulerRouter.put("/scheduled/:postId", updateScheduledPost);
schedulerRouter.put("/scheduled/:postId/reschedule", rescheduleExistingPost);
schedulerRouter.delete("/scheduled/:postId", cancelPost);

// Posted Content Routes
schedulerRouter.get("/posted/:userId", getUserPostedContent);
schedulerRouter.get("/posted/post/:postId", getPostedContentById);

// Queue Status (Admin)
schedulerRouter.get("/queue/status", getSchedulerQueueStatus);

export default schedulerRouter;
