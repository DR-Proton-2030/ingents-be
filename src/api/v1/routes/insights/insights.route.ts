import { Router } from "express";
import {
  getContentMetricsHistory,
  getAccountInsightsHistory,
  getInsightsSummary,
  getWeeklyEngagement,
  triggerSync,
  getUserContentWithMetrics,
  fixFacebookPostIds,
} from "../../controller/insights/insights.controller";

const insightsRouter = Router();

// Weekly engagement aggregation (views for YT, likes for FB/Insta/X)
insightsRouter.get("/weekly-engagement", getWeeklyEngagement);

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

// One-time fix for Facebook posts with wrong platform_post_id
insightsRouter.post("/fix-facebook-post-ids", fixFacebookPostIds);

export default insightsRouter;
