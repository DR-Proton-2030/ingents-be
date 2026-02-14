import { Request, Response } from "express";
import axios from "axios";
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
import { s3Url } from "../../../../config/aws.config";

const isHttpUrl = (url: string) => url.startsWith("http://") || url.startsWith("https://");

const isS3Url = (url: string) => {
  if (!s3Url) return false;
  return url.startsWith(s3Url);
};

const uploadDataUrlToS3 = async (
  dataUrl: string,
  keyPrefix: string
): Promise<string> => {
  const match = dataUrl.match(/^data:(.+);base64,(.+)$/);
  if (!match) {
    throw new Error("Invalid data URL format");
  }
  const mimeType = match[1];
  const buffer = Buffer.from(match[2], "base64");
  const uploaded = await uploadFileToS3Service(keyPrefix, buffer, mimeType);
  if (!uploaded) {
    throw new Error("Failed to upload media to S3");
  }
  return uploaded;
};

const uploadRemoteUrlToS3 = async (
  url: string,
  keyPrefix: string
): Promise<string> => {
  const secureUrl = url.startsWith("http://") ? url.replace("http://", "https://") : url;
  const response = await axios.get(secureUrl, {
    responseType: "arraybuffer",
    headers: {
      "User-Agent": "Mozilla/5.0",
      Accept: "*/*",
    },
  });
  const mimeType = response.headers?.["content-type"] || "application/octet-stream";
  const buffer = Buffer.from(response.data);
  const uploaded = await uploadFileToS3Service(keyPrefix, buffer, mimeType);
  if (!uploaded) {
    throw new Error("Failed to upload media to S3");
  }
  return uploaded;
};

const parseMaybeArray = (value: any): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch (_) {
      return [value];
    }
  }
  return [];
};

const parseMaybeJson = (value: any) => {
  if (!value || typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch (_) {
    return value;
  }
};

const getUploadedMediaFile = (req: Request) => {
  const files = (req as any).files as Record<string, Express.Multer.File[]> | undefined;
  if (!files) return null;
  return (
    files.media?.[0] ||
    files.image?.[0] ||
    files.video?.[0] ||
    null
  );
};

const normalizeScheduledMediaUrls = async (
  mediaUrls: string[] | undefined,
  userId: string,
  platform: string
): Promise<string[]> => {
  if (!mediaUrls || mediaUrls.length === 0) return [];
  const keyPrefix = `scheduled_posts/${platform}/${userId}`;

  const normalized: string[] = [];
  for (const url of mediaUrls) {
    if (!url) continue;
    if (url.startsWith("blob:")) {
      throw new Error(
        "Blob URLs cannot be scheduled. Upload media to S3 first or send a data URL."
      );
    }
    if (isS3Url(url)) {
      normalized.push(url);
      continue;
    }
    if (url.startsWith("data:")) {
      normalized.push(await uploadDataUrlToS3(url, keyPrefix));
      continue;
    }
    if (isHttpUrl(url)) {
      normalized.push(await uploadRemoteUrlToS3(url, keyPrefix));
      continue;
    }
    normalized.push(url);
  }

  return normalized;
};

/**
 * Schedule a new social media post
 */
export const createScheduledPost = async (req: Request, res: Response) => {
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
    } = req.body;

    const parsedMediaUrls = parseMaybeArray(media_urls);
    const parsedHashtags = parseMaybeArray(hashtags);
    const parsedPlatformSpecificData = parseMaybeJson(platform_specific_data) || {};
    const uploadedFile = getUploadedMediaFile(req);
    let uploadedFileUrl: string | null | undefined = null;
    if (uploadedFile) {
      const keyPrefix = `scheduled_posts/${platform}/${user_id}`;
      uploadedFileUrl = await uploadFileToS3Service(
        keyPrefix,
        uploadedFile.buffer,
        uploadedFile.mimetype || "application/octet-stream"
      );
      if (!uploadedFileUrl) {
        throw new Error("Failed to upload media to S3");
      }
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

    if (platform === "instagram" && (!parsedMediaUrls.length && !uploadedFile)) {
      return res.status(400).json({
        success: false,
        message: "Instagram requires at least one media URL",
      });
    }

    if (platform === "youtube" && (!parsedMediaUrls.length && !uploadedFile)) {
      return res.status(400).json({
        success: false,
        message: "YouTube requires a video URL",
      });
    }

    const filteredMediaUrls = uploadedFileUrl
      ? parsedMediaUrls.filter((url) => !url.startsWith("blob:"))
      : parsedMediaUrls;

    const normalizedMediaUrls = await normalizeScheduledMediaUrls(
      filteredMediaUrls,
      user_id,
      platform
    );
    const finalMediaUrls = uploadedFileUrl
      ? [uploadedFileUrl, ...normalizedMediaUrls.filter((u) => u !== uploadedFileUrl)]
      : normalizedMediaUrls;

    const scheduledPost = await schedulePost({
      user_id: new Types.ObjectId(user_id),
      platform,
      content,
      media_urls: finalMediaUrls,
      media_type: media_type || "text",
      hashtags: parsedHashtags,
      scheduled_at: scheduledDate,
      page_id,
      channel_id,
      platform_specific_data: parsedPlatformSpecificData,
    });

    return res.status(201).json({
      success: true,
      message: "Post scheduled successfully",
      data: scheduledPost,
    });
  } catch (error: any) {
    console.error("Error scheduling post:", error);
    const message = error.message || "Failed to schedule post";
    const status =
      message.includes("Blob URLs cannot be scheduled") ||
      message.includes("Invalid data URL")
        ? 400
        : 500;
    return res.status(status).json({
      success: false,
      message,
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

        const parsedMediaUrls = parseMaybeArray(media_urls);
        const parsedHashtags = parseMaybeArray(hashtags);
        const parsedPlatformSpecificData =
          parseMaybeJson(platform_specific_data) || {};

        const normalizedMediaUrls = await normalizeScheduledMediaUrls(
          parsedMediaUrls,
          user_id,
          platform
        );

        const scheduledPost = await schedulePost({
          user_id: new Types.ObjectId(user_id),
          platform,
          content,
          media_urls: normalizedMediaUrls,
          media_type: media_type || "text",
          hashtags: parsedHashtags,
          scheduled_at: new Date(scheduled_at),
          page_id,
          channel_id,
          platform_specific_data: parsedPlatformSpecificData,
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
    const message = error.message || "Failed to schedule posts";
    const status =
      message.includes("Blob URLs cannot be scheduled") ||
      message.includes("Invalid data URL")
        ? 400
        : 500;
    return res.status(status).json({
      success: false,
      message,
    });
  }
};
