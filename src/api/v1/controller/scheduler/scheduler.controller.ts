import { Request, Response } from "express";
import { Types } from "mongoose";
import {
  schedulePost,
  cancelScheduledPost,
  reschedulePost,
  getScheduledPosts,
  getPostedContent,
  getQueueStatus,
} from "../../../../services/scheduler/scheduler.service";
import PostedContentModel from "../../../../models/postedContent/postedContent.model";
import ScheduledPostModel from "../../../../models/scheduledPost/scheduledPost.model";
import { uploadFileToS3Service } from "../../../../services/uploadFile/uploadFile";
import { refreshEngagementForPosts } from "../../../../services/insights/engagementRefresh";
import { logActivity } from "../../../../services/activityLog/activityLog.service";

/**
 * Schedule a new social media post
 * Accepts JSON or multipart/form-data with video/images files
 */
export const createScheduledPost = async (req: Request, res: Response) => {
  try {
    const {
      user_id,
      platform,
      content,
      media_type,
      hashtags,
      scheduled_at,
      page_id,
      channel_id,
      platform_specific_data,
    } = req.body;

    // Parse fields that may come as JSON strings from FormData
    let parsedHashtags = hashtags;
    if (typeof hashtags === "string") {
      try { parsedHashtags = JSON.parse(hashtags); } catch { parsedHashtags = hashtags.split(",").filter(Boolean); }
    }

    let parsedPlatformSpecificData = platform_specific_data;
    if (typeof platform_specific_data === "string") {
      try { parsedPlatformSpecificData = JSON.parse(platform_specific_data); } catch { parsedPlatformSpecificData = {}; }
    }

    // Get media_urls from body (may be JSON string from FormData)
    let media_urls: string[] = req.body.media_urls || [];
    if (typeof media_urls === "string") {
      try { media_urls = JSON.parse(media_urls) as string[]; } catch { media_urls = [media_urls as unknown as string]; }
    }

    // Validation
    if (!user_id || !platform || !content || !scheduled_at) {
      return res.status(400).json({
        success: false,
        message: "user_id, platform, content, and scheduled_at are required",
      });
    }

    // Validate platform
    const validPlatforms = ["facebook", "instagram", "youtube", "x"];
    if (!validPlatforms.includes(platform)) {
      return res.status(400).json({
        success: false,
        message: `Invalid platform. Must be one of: ${validPlatforms.join(", ")}`,
      });
    }

    // Validate scheduled_at is in the future
    const scheduledDate = new Date(scheduled_at);
    if (scheduledDate <= new Date()) {
      return res.status(400).json({
        success: false,
        message: "scheduled_at must be in the future",
      });
    }

    // Platform-specific validations
    if (platform === "facebook" && !page_id) {
      return res.status(400).json({
        success: false,
        message: "page_id is required for Facebook posts",
      });
    }

    // Handle uploaded files → S3
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

    if (files?.video?.length) {
      const videoFile = files.video[0];
      const s3Url = await uploadFileToS3Service(
        `scheduled-posts/${user_id}/videos`,
        videoFile.buffer,
        videoFile.mimetype || "video/mp4"
      );
      if (!s3Url) {
        return res.status(500).json({ success: false, message: "Failed to upload video to storage" });
      }
      media_urls = [s3Url];
    }

    if (files?.images?.length) {
      const uploadedUrls: string[] = [];
      for (const imgFile of files.images) {
        const s3Url = await uploadFileToS3Service(
          `scheduled-posts/${user_id}/images`,
          imgFile.buffer,
          imgFile.mimetype || "image/jpeg"
        );
        if (s3Url) uploadedUrls.push(s3Url);
      }
      if (uploadedUrls.length > 0) {
        media_urls = [...media_urls, ...uploadedUrls];
      }
    }

    if (platform === "instagram" && (!media_urls || media_urls.length === 0)) {
      return res.status(400).json({
        success: false,
        message: "Instagram requires at least one media URL",
      });
    }

    if (platform === "youtube" && (!media_urls || media_urls.length === 0)) {
      return res.status(400).json({
        success: false,
        message: "YouTube requires a video URL",
      });
    }

    const scheduledPost = await schedulePost({
      user_id: new Types.ObjectId(user_id),
      platform,
      content,
      media_urls: media_urls || [],
      media_type: media_type || "text",
      hashtags: parsedHashtags || [],
      scheduled_at: scheduledDate,
      page_id,
      channel_id,
      platform_specific_data: parsedPlatformSpecificData || {},
    });

    logActivity({
      company_object_id: req.user?.company_object_id?.toString(),
      actor_object_id: req.user?._id?.toString() || user_id,
      actor_name: req.user?.full_name || "Unknown",
      activity_type: "POST_SCHEDULED",
      message: `scheduled a ${platform} post`,
      metadata: { post_id: scheduledPost?._id, platform },
    });

    return res.status(201).json({
      success: true,
      message: "Post scheduled successfully",
      data: scheduledPost,
    });
  } catch (error: any) {
    console.error("Error scheduling post:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to schedule post",
    });
  }
};

/**
 * Get all scheduled posts for a user
 */
export const getUserScheduledPosts = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { status, platform } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId is required",
      });
    }

    const scheduledPosts = await getScheduledPosts(
      userId,
      status as string | undefined,
      platform as string | undefined
    );

    return res.status(200).json({
      success: true,
      data: scheduledPosts,
      count: scheduledPosts.length,
    });
  } catch (error: any) {
    console.error("Error fetching scheduled posts:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch scheduled posts",
    });
  }
};

/**
 * Get a single scheduled post by ID
 */
export const getScheduledPostById = async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;

    if (!postId) {
      return res.status(400).json({
        success: false,
        message: "postId is required",
      });
    }

    const scheduledPost = await ScheduledPostModel.findById(postId);

    if (!scheduledPost) {
      return res.status(404).json({
        success: false,
        message: "Scheduled post not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: scheduledPost,
    });
  } catch (error: any) {
    console.error("Error fetching scheduled post:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch scheduled post",
    });
  }
};

/**
 * Cancel a scheduled post
 */
export const cancelPost = async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;

    if (!postId) {
      return res.status(400).json({
        success: false,
        message: "postId is required",
      });
    }

    await cancelScheduledPost(postId);

    return res.status(200).json({
      success: true,
      message: "Post cancelled successfully",
    });
  } catch (error: any) {
    console.error("Error cancelling post:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to cancel post",
    });
  }
};

/**
 * Reschedule a post to a new time
 */
export const rescheduleExistingPost = async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const { scheduled_at } = req.body;

    if (!postId || !scheduled_at) {
      return res.status(400).json({
        success: false,
        message: "postId and scheduled_at are required",
      });
    }

    const newScheduledDate = new Date(scheduled_at);
    if (newScheduledDate <= new Date()) {
      return res.status(400).json({
        success: false,
        message: "scheduled_at must be in the future",
      });
    }

    const updatedPost = await reschedulePost(postId, newScheduledDate);

    return res.status(200).json({
      success: true,
      message: "Post rescheduled successfully",
      data: updatedPost,
    });
  } catch (error: any) {
    console.error("Error rescheduling post:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to reschedule post",
    });
  }
};

/**
 * Update a scheduled post content
 */
export const updateScheduledPost = async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const updateData = req.body;

    if (!postId) {
      return res.status(400).json({
        success: false,
        message: "postId is required",
      });
    }

    const existingPost = await ScheduledPostModel.findById(postId);

    if (!existingPost) {
      return res.status(404).json({
        success: false,
        message: "Scheduled post not found",
      });
    }

    if (existingPost.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Cannot update a post that is not pending",
      });
    }

    // Only allow updating certain fields
    const allowedUpdates = [
      "content",
      "media_urls",
      "media_type",
      "hashtags",
      "platform_specific_data",
    ];

    const updates: Record<string, any> = {};
    for (const key of allowedUpdates) {
      if (updateData[key] !== undefined) {
        updates[key] = updateData[key];
      }
    }

    const updatedPost = await ScheduledPostModel.findByIdAndUpdate(
      postId,
      { $set: updates },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Post updated successfully",
      data: updatedPost,
    });
  } catch (error: any) {
    console.error("Error updating scheduled post:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update scheduled post",
    });
  }
};

/**
 * Get posted content history for a user
 */
export const getUserPostedContent = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { platform, limit } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId is required",
      });
    }

    const postedContent = await getPostedContent(
      userId,
      platform as string | undefined,
      limit ? parseInt(limit as string, 10) : undefined
    );

    // Refresh engagement metrics in the background for posts that haven't been synced recently
    refreshEngagementForPosts(userId, postedContent).catch((err) => {
      console.error("[PostedContent] Background engagement refresh failed:", err.message);
    });

    return res.status(200).json({
      success: true,
      data: postedContent,
      count: postedContent.length,
    });
  } catch (error: any) {
    console.error("Error fetching posted content:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch posted content",
    });
  }
};

/**
 * Get a single posted content by ID
 */
export const getPostedContentById = async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;

    if (!postId) {
      return res.status(400).json({
        success: false,
        message: "postId is required",
      });
    }

    const postedContent = await PostedContentModel.findById(postId);

    if (!postedContent) {
      return res.status(404).json({
        success: false,
        message: "Posted content not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: postedContent,
    });
  } catch (error: any) {
    console.error("Error fetching posted content:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch posted content",
    });
  }
};

/**
 * Get queue status (admin)
 */
export const getSchedulerQueueStatus = async (req: Request, res: Response) => {
  try {
    const status = await getQueueStatus();

    return res.status(200).json({
      success: true,
      data: status,
    });
  } catch (error: any) {
    console.error("Error fetching queue status:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch queue status",
    });
  }
};

/**
 * Schedule multiple posts at once (bulk scheduling)
 */
export const createBulkScheduledPosts = async (req: Request, res: Response) => {
  try {
    const { posts } = req.body;

    if (!posts || !Array.isArray(posts) || posts.length === 0) {
      return res.status(400).json({
        success: false,
        message: "posts array is required",
      });
    }

    const results = {
      success: [] as any[],
      failed: [] as any[],
    };

    for (const postData of posts) {
      try {
        const {
          user_id,
          platform,
          content,
          media_urls,
          media_type,
          hashtags,
          scheduled_at,
          page_id,
          channel_id,
          platform_specific_data,
        } = postData;

        const scheduledPost = await schedulePost({
          user_id: new Types.ObjectId(user_id),
          platform,
          content,
          media_urls: media_urls || [],
          media_type: media_type || "text",
          hashtags: hashtags || [],
          scheduled_at: new Date(scheduled_at),
          page_id,
          channel_id,
          platform_specific_data: platform_specific_data || {},
        });

        results.success.push(scheduledPost);
      } catch (error: any) {
        results.failed.push({
          data: postData,
          error: error.message,
        });
      }
    }

    return res.status(201).json({
      success: true,
      message: `Scheduled ${results.success.length} posts, ${results.failed.length} failed`,
      data: results,
    });
  } catch (error: any) {
    console.error("Error bulk scheduling posts:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to schedule posts",
    });
  }
};
