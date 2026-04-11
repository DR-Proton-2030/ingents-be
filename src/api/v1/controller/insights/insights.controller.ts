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
 * GET /api/v1/insights/weekly-engagement
 * Returns weekly aggregated engagement metrics per platform.
 * YouTube → views, Facebook/Instagram/X → likes.
 * Reads directly from PostedContent.engagement (always available).
 * Query: ?userId=&weeks=6
 */
export const getWeeklyEngagement = async (req: Request, res: Response) => {
  try {
    const { userId, weeks = "6" } = req.query;

    if (!userId) {
      return res.status(400).json({ success: false, message: "userId is required" });
    }

    const weeksNum = Math.min(parseInt(weeks as string, 10) || 6, 52);
    const now = new Date();
    const since = new Date(now.getTime() - weeksNum * 7 * 24 * 60 * 60 * 1000);

    const getWeekLabel = (weekStartInput: Date) => {
      const weekStart = new Date(weekStartInput);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const labelDate = weekEnd > now ? now : weekEnd;
      return labelDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    };

    // Aggregate directly from PostedContent, grouped by ISO week + platform
    const pipeline = [
      {
        $match: {
          user_id: new Types.ObjectId(userId as string),
          status: "published",
          posted_at: { $gte: since },
        },
      },
      {
        $addFields: {
          weekStart: {
            $dateFromParts: {
              isoWeekYear: { $isoWeekYear: "$posted_at" },
              isoWeek: { $isoWeek: "$posted_at" },
              isoDayOfWeek: 1,
            },
          },
        },
      },
      {
        $group: {
          _id: { weekStart: "$weekStart", platform: "$platform" },
          views: { $sum: { $ifNull: ["$engagement.views", 0] } },
          likes: { $sum: { $ifNull: ["$engagement.likes", 0] } },
          comments: { $sum: { $ifNull: ["$engagement.comments", 0] } },
          shares: { $sum: { $ifNull: ["$engagement.shares", 0] } },
          postCount: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: "$_id.weekStart",
          platforms: {
            $push: {
              platform: "$_id.platform",
              views: "$views",
              likes: "$likes",
              comments: "$comments",
              shares: "$shares",
              postCount: "$postCount",
            },
          },
        },
      },
      { $sort: { _id: 1 as const } },
    ];

    const rawWeeks = await PostedContentModel.aggregate(pipeline);

    // Build week entries: YouTube → views, FB/Insta/X → likes
    const result = rawWeeks.map((week: any) => {
      const weekDate = new Date(week._id);
      const weekLabel = getWeekLabel(weekDate);

      const entry: Record<string, any> = {
        week: weekLabel,
        weekStart: week._id,
        youtube: 0,
        facebook: 0,
        instagram: 0,
        x: 0,
      };

      week.platforms.forEach((p: any) => {
        if (p.platform === "youtube") {
          entry.youtube = p.views || 0;
        } else if (p.platform in entry) {
          entry[p.platform] = p.likes || 0;
        }
      });

      return entry;
    });

    // Fill in missing weeks with zeros
    const allWeeks: any[] = [];
    for (let i = weeksNum - 1; i >= 0; i--) {
      const weekStart = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      // Align to Monday
      const dayOfWeek = weekStart.getDay();
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      weekStart.setDate(weekStart.getDate() + diff);
      weekStart.setHours(0, 0, 0, 0);

      const weekLabel = getWeekLabel(weekStart);

      const existing = result.find((r: any) => {
        const rDate = new Date(r.weekStart);
        return (
          rDate.getFullYear() === weekStart.getFullYear() &&
          rDate.getMonth() === weekStart.getMonth() &&
          rDate.getDate() === weekStart.getDate()
        );
      });

      allWeeks.push(
        existing || {
          week: weekLabel,
          weekStart: weekStart.toISOString(),
          youtube: 0,
          facebook: 0,
          instagram: 0,
          x: 0,
        }
      );
    }

    return res.json({
      success: true,
      result: {
        weeks: allWeeks,
        meta: {
          youtube: "views",
          facebook: "likes",
          instagram: "likes",
          x: "likes",
        },
      },
    });
  } catch (error: any) {
    console.error("[Insights] Weekly engagement error:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

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
