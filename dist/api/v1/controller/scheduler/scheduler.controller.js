"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBulkScheduledPosts = exports.getSchedulerQueueStatus = exports.getPostedContentById = exports.getUserPostedContent = exports.updateScheduledPost = exports.rescheduleExistingPost = exports.cancelPost = exports.getScheduledPostById = exports.getUserScheduledPosts = exports.createScheduledPost = void 0;
const mongoose_1 = require("mongoose");
const scheduler_service_1 = require("../../../../services/scheduler/scheduler.service");
const postedContent_model_1 = __importDefault(require("../../../../models/postedContent/postedContent.model"));
const scheduledPost_model_1 = __importDefault(require("../../../../models/scheduledPost/scheduledPost.model"));
/**
 * Schedule a new social media post
 */
const createScheduledPost = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { user_id, platform, content, media_urls, media_type, hashtags, scheduled_at, page_id, channel_id, platform_specific_data, } = req.body;
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
        const scheduledPost = yield (0, scheduler_service_1.schedulePost)({
            user_id: new mongoose_1.Types.ObjectId(user_id),
            platform,
            content,
            media_urls: media_urls || [],
            media_type: media_type || "text",
            hashtags: hashtags || [],
            scheduled_at: scheduledDate,
            page_id,
            channel_id,
            platform_specific_data: platform_specific_data || {},
        });
        return res.status(201).json({
            success: true,
            message: "Post scheduled successfully",
            data: scheduledPost,
        });
    }
    catch (error) {
        console.error("Error scheduling post:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to schedule post",
        });
    }
});
exports.createScheduledPost = createScheduledPost;
/**
 * Get all scheduled posts for a user
 */
const getUserScheduledPosts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.params;
        const { status, platform } = req.query;
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "userId is required",
            });
        }
        const scheduledPosts = yield (0, scheduler_service_1.getScheduledPosts)(userId, status, platform);
        return res.status(200).json({
            success: true,
            data: scheduledPosts,
            count: scheduledPosts.length,
        });
    }
    catch (error) {
        console.error("Error fetching scheduled posts:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch scheduled posts",
        });
    }
});
exports.getUserScheduledPosts = getUserScheduledPosts;
/**
 * Get a single scheduled post by ID
 */
const getScheduledPostById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { postId } = req.params;
        if (!postId) {
            return res.status(400).json({
                success: false,
                message: "postId is required",
            });
        }
        const scheduledPost = yield scheduledPost_model_1.default.findById(postId);
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
    }
    catch (error) {
        console.error("Error fetching scheduled post:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch scheduled post",
        });
    }
});
exports.getScheduledPostById = getScheduledPostById;
/**
 * Cancel a scheduled post
 */
const cancelPost = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { postId } = req.params;
        if (!postId) {
            return res.status(400).json({
                success: false,
                message: "postId is required",
            });
        }
        yield (0, scheduler_service_1.cancelScheduledPost)(postId);
        return res.status(200).json({
            success: true,
            message: "Post cancelled successfully",
        });
    }
    catch (error) {
        console.error("Error cancelling post:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to cancel post",
        });
    }
});
exports.cancelPost = cancelPost;
/**
 * Reschedule a post to a new time
 */
const rescheduleExistingPost = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        const updatedPost = yield (0, scheduler_service_1.reschedulePost)(postId, newScheduledDate);
        return res.status(200).json({
            success: true,
            message: "Post rescheduled successfully",
            data: updatedPost,
        });
    }
    catch (error) {
        console.error("Error rescheduling post:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to reschedule post",
        });
    }
});
exports.rescheduleExistingPost = rescheduleExistingPost;
/**
 * Update a scheduled post content
 */
const updateScheduledPost = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { postId } = req.params;
        const updateData = req.body;
        if (!postId) {
            return res.status(400).json({
                success: false,
                message: "postId is required",
            });
        }
        const existingPost = yield scheduledPost_model_1.default.findById(postId);
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
        const updates = {};
        for (const key of allowedUpdates) {
            if (updateData[key] !== undefined) {
                updates[key] = updateData[key];
            }
        }
        const updatedPost = yield scheduledPost_model_1.default.findByIdAndUpdate(postId, { $set: updates }, { new: true });
        return res.status(200).json({
            success: true,
            message: "Post updated successfully",
            data: updatedPost,
        });
    }
    catch (error) {
        console.error("Error updating scheduled post:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to update scheduled post",
        });
    }
});
exports.updateScheduledPost = updateScheduledPost;
/**
 * Get posted content history for a user
 */
const getUserPostedContent = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.params;
        const { platform, limit } = req.query;
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "userId is required",
            });
        }
        const postedContent = yield (0, scheduler_service_1.getPostedContent)(userId, platform, limit ? parseInt(limit, 10) : undefined);
        return res.status(200).json({
            success: true,
            data: postedContent,
            count: postedContent.length,
        });
    }
    catch (error) {
        console.error("Error fetching posted content:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch posted content",
        });
    }
});
exports.getUserPostedContent = getUserPostedContent;
/**
 * Get a single posted content by ID
 */
const getPostedContentById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { postId } = req.params;
        if (!postId) {
            return res.status(400).json({
                success: false,
                message: "postId is required",
            });
        }
        const postedContent = yield postedContent_model_1.default.findById(postId);
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
    }
    catch (error) {
        console.error("Error fetching posted content:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch posted content",
        });
    }
});
exports.getPostedContentById = getPostedContentById;
/**
 * Get queue status (admin)
 */
const getSchedulerQueueStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const status = yield (0, scheduler_service_1.getQueueStatus)();
        return res.status(200).json({
            success: true,
            data: status,
        });
    }
    catch (error) {
        console.error("Error fetching queue status:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch queue status",
        });
    }
});
exports.getSchedulerQueueStatus = getSchedulerQueueStatus;
/**
 * Schedule multiple posts at once (bulk scheduling)
 */
const createBulkScheduledPosts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { posts } = req.body;
        if (!posts || !Array.isArray(posts) || posts.length === 0) {
            return res.status(400).json({
                success: false,
                message: "posts array is required",
            });
        }
        const results = {
            success: [],
            failed: [],
        };
        for (const postData of posts) {
            try {
                const { user_id, platform, content, media_urls, media_type, hashtags, scheduled_at, page_id, channel_id, platform_specific_data, } = postData;
                const scheduledPost = yield (0, scheduler_service_1.schedulePost)({
                    user_id: new mongoose_1.Types.ObjectId(user_id),
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
            }
            catch (error) {
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
    }
    catch (error) {
        console.error("Error bulk scheduling posts:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to schedule posts",
        });
    }
});
exports.createBulkScheduledPosts = createBulkScheduledPosts;
