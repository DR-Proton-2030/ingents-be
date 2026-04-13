"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const insights_controller_1 = require("../../controller/insights/insights.controller");
const insightsRouter = (0, express_1.Router)();
// Weekly engagement aggregation (views for YT, likes for FB/Insta/X)
insightsRouter.get("/weekly-engagement", insights_controller_1.getWeeklyEngagement);
// Content metrics history for a specific post
insightsRouter.get("/content/:postId/history", insights_controller_1.getContentMetricsHistory);
// All posted content with latest metrics for a user
insightsRouter.get("/content/user/:userId", insights_controller_1.getUserContentWithMetrics);
// Account-level insights history for a platform
insightsRouter.get("/account/:platform/history", insights_controller_1.getAccountInsightsHistory);
// Aggregated summary across all platforms
insightsRouter.get("/summary", insights_controller_1.getInsightsSummary);
// Trigger on-demand sync
insightsRouter.post("/sync", insights_controller_1.triggerSync);
// One-time fix for Facebook posts with wrong platform_post_id
insightsRouter.post("/fix-facebook-post-ids", insights_controller_1.fixFacebookPostIds);
exports.default = insightsRouter;
