import { Request, Response } from "express";
import { Types } from "mongoose";
import ContentMetricsSnapshotModel from "../../../../models/contentMetricsSnapshot/contentMetricsSnapshot.model";
import PlatformInsightsSnapshotModel from "../../../../models/platformInsightsSnapshot/platformInsightsSnapshot.model";
import PostedContentModel from "../../../../models/postedContent/postedContent.model";
import {
  triggerUserSync,
  getLatestInsightsSummary,
} from "../../../../services/insights/insightsSync.service";

/**
 * GET /api/v1/insights/content/:postId/history
 * Returns engagement metric snapshots over time for a specific post
 */
export const getContentMetricsHistory = async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const { days = "30" } = req.query;

    if (!Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ success: false, message: "Invalid postId" });
    }

    const daysNum = Math.min(parseInt(days as string, 10) || 30, 90);
    const since = new Date(Date.now() - daysNum * 24 * 60 * 60 * 1000);

    const snapshots = await ContentMetricsSnapshotModel.find({
      posted_content_id: new Types.ObjectId(postId),
      snapshot_at: { $gte: since },
    })
      .sort({ snapshot_at: 1 })
      .lean();

    const post = await PostedContentModel.findById(postId)
      .select("platform content media_type posted_at engagement platform_post_id")
      .lean();

    return res.json({
      success: true,
      result: {
        post,
        snapshots,
        count: snapshots.length,
      },
    });
  } catch (error: any) {
    console.error("[Insights] Content history error:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/v1/insights/account/:platform/history
 * Returns account-level metric history for a platform
 */
export const getAccountInsightsHistory = async (req: Request, res: Response) => {
  try {
    const { platform } = req.params;
    const { userId, days = "30" } = req.query;

    if (!userId) {
      return res.status(400).json({ success: false, message: "userId is required" });
    }

    const validPlatforms = ["facebook", "instagram", "youtube", "x"];
    if (!validPlatforms.includes(platform)) {
      return res.status(400).json({ success: false, message: "Invalid platform" });
    }

    const daysNum = Math.min(parseInt(days as string, 10) || 30, 90);
    const since = new Date(Date.now() - daysNum * 24 * 60 * 60 * 1000);

    const snapshots = await PlatformInsightsSnapshotModel.find({
      user_id: userId as string,
      platform,
      snapshot_at: { $gte: since },
    })
      .sort({ snapshot_at: 1 })
      .lean();

    return res.json({
      success: true,
      result: {
        platform,
        snapshots,
        count: snapshots.length,
      },
    });
  } catch (error: any) {
    console.error("[Insights] Account history error:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/v1/insights/summary
 * Returns latest aggregated metrics for all platforms + recent content
 */
export const getInsightsSummary = async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ success: false, message: "userId is required" });
    }

    const summary = await getLatestInsightsSummary(userId as string);

    return res.json({
      success: true,
      result: summary,
    });
  } catch (error: any) {
    console.error("[Insights] Summary error:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/v1/insights/sync
 * Triggers an on-demand sync for a user (debounced to 30 min)
 */
export const triggerSync = async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: "userId is required" });
    }

    const triggered = await triggerUserSync(userId);

    return res.json({
      success: true,
      message: triggered
        ? "Sync triggered successfully"
        : "Sync was recently triggered, please wait before retrying",
      syncing: triggered,
    });
  } catch (error: any) {
    console.error("[Insights] Sync trigger error:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/v1/insights/content/user/:userId
 * Returns all posted content with latest metrics for a user
 */
export const getUserContentWithMetrics = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { platform, limit = "20", offset = "0" } = req.query;

    if (!userId) {
      return res.status(400).json({ success: false, message: "userId is required" });
    }

    const query: any = { user_id: userId, status: "published" };
    if (platform) query.platform = platform;

    const posts = await PostedContentModel.find(query)
      .sort({ posted_at: -1 })
      .skip(parseInt(offset as string, 10))
      .limit(parseInt(limit as string, 10))
      .lean();

    const total = await PostedContentModel.countDocuments(query);

    return res.json({
      success: true,
      result: {
        posts,
        total,
        limit: parseInt(limit as string, 10),
        offset: parseInt(offset as string, 10),
      },
    });
  } catch (error: any) {
    console.error("[Insights] User content error:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};
