import { Router } from "express";
import {
  getContentMetricsHistory,
  getAccountInsightsHistory,
  getInsightsSummary,
  triggerSync,
  getUserContentWithMetrics,
} from "../../controller/insights/insights.controller";

const insightsRouter = Router();

// Content metrics history for a specific post
insightsRouter.get("/content/:postId/history", getContentMetricsHistory);

// All posted content with latest metrics for a user
insightsRouter.get("/content/user/:userId", getUserContentWithMetrics);

// Account-level insights history for a platform
insightsRouter.get("/account/:platform/history", getAccountInsightsHistory);

// Aggregated summary across all platforms
insightsRouter.get("/summary", getInsightsSummary);

// Trigger on-demand sync
insightsRouter.post("/sync", triggerSync);

export default insightsRouter;
