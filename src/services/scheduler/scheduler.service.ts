import { Queue, Worker, Job, QueueEvents } from "bullmq";
import { Redis } from "ioredis";
import { REDIS_CONFIG, QUEUE_NAMES, DEFAULT_JOB_OPTIONS } from "../../config/redis.config";
import ScheduledPostModel from "../../models/scheduledPost/scheduledPost.model";
import PostedContentModel from "../../models/postedContent/postedContent.model";
import CampaignModel from "../../models/campaign/campaign.model";
import UserModel from "../../models/users/users.model";
import { IScheduledPost } from "../../models/scheduledPost/scheduledPost.schema";
import { postToFacebook } from "../facebook/postToFacebook";
import { postToInstagram } from "../instagram/postToInstagram";
import { postToYoutube } from "../youtube/postToYoutube";
import { postToX } from "../x/postToX";
import { Types } from "mongoose";
import { SocialMediaJobData } from "../../types/interface/socialMediaJob.interface";
import { sendWhatsappMessage } from "../whatsapp/whatsapp.service";
import { LLMWithRagService } from "../llmWithRag/llmWithRag.service";
import AITokenUsageModel from "../../models/aiTokenUsage/aiTokenUsage.model";

const llmService = new LLMWithRagService();

// Track if Redis is available
let isRedisAvailable = false;
let socialMediaQueue: Queue<SocialMediaJobData> | null = null;
let queueEvents: QueueEvents | null = null;

// Initialize Queue lazily
const getQueue = (): Queue<SocialMediaJobData> | null => {
  if (!isRedisAvailable) return null;
  if (!socialMediaQueue) {
    socialMediaQueue = new Queue<SocialMediaJobData>(
      QUEUE_NAMES.SOCIAL_MEDIA_POST,
      {
        connection: REDIS_CONFIG,
        defaultJobOptions: DEFAULT_JOB_OPTIONS,
      }
    );
    // Add global error handler to prevent unhandled error event noise
    socialMediaQueue.on("error", (err) => {
      console.error(`[Scheduler] Queue Error: ${err.message}`);
    });
  }
  return socialMediaQueue;
};

// Schedule a social media post
export const schedulePost = async (
  postData: Omit<IScheduledPost, "_id" | "createdAt" | "updatedAt" | "job_id" | "status">
): Promise<IScheduledPost> => {
  // Create scheduled post in database
  const scheduledPost = await ScheduledPostModel.create({
    ...postData,
    status: "pending",
  });

  // Calculate delay until scheduled time
  const delay = new Date(postData.scheduled_at).getTime() - Date.now();

  // Only schedule if delay is positive (future time) and Redis is available
  const queue = getQueue();
  if (delay > 0 && queue) {
    const job = await queue.add(
      "post",
      {
        scheduledPostId: scheduledPost._id!.toString(),
        platform: postData.platform,
        userId: postData.user_id.toString(),
        content: postData.content,
        mediaUrls: postData.media_urls,
        mediaType: postData.media_type,
        hashtags: postData.hashtags,
        pageId: postData.page_id,
        channelId: postData.channel_id,
        platformSpecificData: postData.platform_specific_data,
      },
      {
        delay,
        jobId: scheduledPost._id!.toString(),
      }
    );

    // Update scheduled post with job ID
    await ScheduledPostModel.findByIdAndUpdate(scheduledPost._id, {
      job_id: job.id,
    });

    scheduledPost.job_id = job.id;
  } else if (delay <= 0) {
    // If scheduled time is in the past, mark as failed
    await ScheduledPostModel.findByIdAndUpdate(scheduledPost._id, {
      status: "failed",
      error_message: "Scheduled time is in the past",
    });
  }
  // If Redis not available, post stays in pending state in DB

  return scheduledPost;
};

// Map day strings to cron day numbers (0-6)
const DAY_MAP: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

// Schedule a repeatable campaign trigger
export const scheduleRecurringCampaign = async (
  campaignId: string,
  timeString: string, // format: "HH:MM" e.g., "14:30"
  days: string[] // e.g., ["Mon", "Wed"]
): Promise<void> => {
  const queue = getQueue();
  if (!queue) return;

  const [hours, minutes] = timeString.split(":");
  const numericDays = days.map(day => DAY_MAP[day]).filter(d => d !== undefined).join(",");

  if (!numericDays || !hours || !minutes) {
    throw new Error("Invalid schedule parameters for repeatable job");
  }

  // standard cron: MINUTE HOUR * * DAYS
  const cronPattern = `${parseInt(minutes)} ${parseInt(hours)} * * ${numericDays}`;

  await queue.add(
    "campaign-trigger",
    { campaignId } as any, // bypassing interface strictness for the trigger payload
    {
      repeat: { pattern: cronPattern },
      jobId: `campaign-trigger-${campaignId}`,
    }
  );
};

// Cancel a repeatable campaign trigger
export const cancelRecurringCampaign = async (campaignId: string): Promise<void> => {
  const queue = getQueue();
  if (!queue) return;
  const repeatableJobs = await queue.getRepeatableJobs();
  const job = repeatableJobs.find(j => j.id === `campaign-trigger-${campaignId}`);
  if (job) {
    await queue.removeRepeatableByKey(job.key);
  }
};


// Trigger a campaign once (one-time blast)
export const triggerCampaignNow = async (campaignId: string): Promise<void> => {
  const queue = getQueue();
  if (!queue) return;

  await queue.add(
    "campaign-trigger",
    { campaignId } as any,
    {
      jobId: `campaign-trigger-once-${campaignId}-${Date.now()}`,
      removeOnComplete: true,
    }
  );
};

// Cancel a scheduled post
export const cancelScheduledPost = async (postId: string): Promise<boolean> => {
  const scheduledPost = await ScheduledPostModel.findById(postId);

  if (!scheduledPost) {
    throw new Error("Scheduled post not found");
  }

  if (scheduledPost.status !== "pending") {
    throw new Error("Cannot cancel a post that is not pending");
  }

  // Remove job from queue if Redis is available
  const queue = getQueue();
  if (scheduledPost.job_id && queue) {
    const job = await queue.getJob(scheduledPost.job_id);
    if (job) {
      await job.remove();
    }
  }

  // Update status in database
  await ScheduledPostModel.findByIdAndUpdate(postId, {
    status: "cancelled",
  });

  return true;
};

// Reschedule a post
export const reschedulePost = async (
  postId: string,
  newScheduledAt: Date
): Promise<IScheduledPost | null> => {
  const scheduledPost = await ScheduledPostModel.findById(postId);

  if (!scheduledPost) {
    throw new Error("Scheduled post not found");
  }

  if (scheduledPost.status !== "pending") {
    throw new Error("Cannot reschedule a post that is not pending");
  }

  // Remove existing job if Redis is available
  const queue = getQueue();
  if (scheduledPost.job_id && queue) {
    const existingJob = await queue.getJob(scheduledPost.job_id);
    if (existingJob) {
      await existingJob.remove();
    }
  }

  // Calculate new delay
  const delay = newScheduledAt.getTime() - Date.now();

  if (delay <= 0) {
    throw new Error("New scheduled time must be in the future");
  }

  let newJobId: string | undefined;

  // Add new job with updated delay if Redis is available
  if (queue) {
    const newJob = await queue.add(
      "post",
      {
        scheduledPostId: scheduledPost._id!.toString(),
        platform: scheduledPost.platform,
        userId: scheduledPost.user_id.toString(),
        content: scheduledPost.content,
        mediaUrls: scheduledPost.media_urls,
        mediaType: scheduledPost.media_type,
        hashtags: scheduledPost.hashtags,
        pageId: scheduledPost.page_id,
        channelId: scheduledPost.channel_id,
        platformSpecificData: scheduledPost.platform_specific_data,
      },
      {
        delay,
        jobId: `${scheduledPost._id!.toString()}-${Date.now()}`,
      }
    );
    newJobId = newJob.id;
  }

  // Update scheduled post
  const updatedPost = await ScheduledPostModel.findByIdAndUpdate(
    postId,
    {
      scheduled_at: newScheduledAt,
      job_id: newJobId,
    },
    { new: true }
  );

  return updatedPost;
};

// Get scheduled posts for a user
export const getScheduledPosts = async (
  userId: string,
  status?: string,
  platform?: string
) => {
  const query: Record<string, any> = { user_id: new Types.ObjectId(userId) };

  if (status) {
    query.status = status;
  }

  if (platform) {
    query.platform = platform;
  }

  return ScheduledPostModel.find(query).sort({ scheduled_at: 1 });
};

// Get posted content for a user
export const getPostedContent = async (
  userId: string,
  platform?: string,
  limit?: number
) => {
  const query: Record<string, any> = { user_id: new Types.ObjectId(userId) };

  if (platform) {
    query.platform = platform;
  }

  let queryBuilder = PostedContentModel.find(query).sort({ posted_at: -1 });

  if (limit) {
    queryBuilder = queryBuilder.limit(limit);
  }

  return queryBuilder;
};

// Process the job - called by worker
export const processPostJob = async (job: Job<SocialMediaJobData>): Promise<any> => {
  if (job.name === "campaign-trigger") {
    const triggerData = job.data as any;
    const campaign = await CampaignModel.findById(triggerData.campaignId);

    if (!campaign || campaign.status !== "active") {
      return { message: "Campaign inactive or not found, ignored." };
    }

    const user = await UserModel.findById(campaign.created_by_user_object_id);
    if (!user) return { message: "User not found." };

    let finalContent = campaign.message_content;

    if (campaign.use_ai_generation && campaign.ai_context) {
      console.log(`[Scheduler] Generating AI content for campaign ${campaign._id}...`);
      try {
        // Use Gemini for high quality generative content
        const result: any = await llmService.generateGeminiResponseWithRag(
          `Generate a professional and engaging social media post based on this brief: "${campaign.ai_context}". Only return the post content text.`,
          "You are a creative social media manager expert at writing viral and engaging posts."
        );

        if (result && result.content) {
          finalContent = result.content;
          console.log(`[Scheduler] AI Content generated successfully.`, result);
          // Update campaign with generated content so it's visible in UI
          await CampaignModel.findByIdAndUpdate(campaign._id, { message_content: finalContent });

          if (result.usage) {
            await AITokenUsageModel.create({
              company_object_id: campaign.company_object_id,
              user_object_id: campaign.created_by_user_object_id,
              feature: "campaign_generation",
              tokens_used: result.usage.totalTokens,
              prompt_tokens: result.usage.promptTokens,
              completion_tokens: result.usage.completionTokens,
            });
          }
        } else {
          console.warn(`[Scheduler] AI returned empty content for campaign ${campaign._id}`);
        }
      } catch (err: any) {
        const errorDetail = err.response?.data?.error || err;
        console.error(`\x1b[31m[Scheduler] AI generation failed for campaign ${campaign._id}:\x1b[0m`, JSON.stringify(errorDetail, null, 2));

        if (err.message?.includes("SERVICE_DISABLED") || JSON.stringify(errorDetail).includes("SERVICE_DISABLED")) {
          console.error(`\x1b[33m[CRITICAL] Gemini API is not enabled. Please enable it at: https://console.developers.google.com/apis/api/generativelanguage.googleapis.com/overview?project=589284612267\x1b[0m`);
        }
      }
    }

    if (!finalContent || finalContent.trim() === "") {
      console.error(`\x1b[31m[Scheduler] Campaign ${campaign._id} ("${campaign.name}") has no message content. Aborting trigger.\x1b[0m`);
      return { success: false, message: "Campaign content is empty. Generation might have failed." };
    }

    if (campaign.type === "whatsapp_messenger") {
      if (!user.whatsapp?.phone_number_id || !user.whatsapp?.access_token) {
        return { message: "WhatsApp API credentials not found or disconnected." };
      }

      const targetNumbers = campaign.target_numbers || [];
      console.log(`[Scheduler] Firing recurring WhatsApp campaign ${campaign._id} to ${targetNumbers.length} numbers.`);

      // Distribute messages securely (not async bombing at once) via delay buffer if needed, 
      // for now just simple sequential queue processing
      for (const number of targetNumbers) {
        try {
          await sendWhatsappMessage(
            user.whatsapp.phone_number_id,
            user.whatsapp.access_token,
            number,
            finalContent
          );
        } catch (e) {
          console.error(`Failed to send WhatsApp message to ${number}`, e);
        }
      }
      return { success: true, message: "WhatsApp broadcast completed." };
    }

    // Social Broadcaster logic
    const platforms: ("facebook" | "instagram" | "youtube" | "x")[] = [];
    if (user.facebook?.access_token && user.facebook?.project_id) platforms.push("facebook");
    if (user.instagram?.access_token) platforms.push("instagram");
    if (user.youtube?.access_token) platforms.push("youtube");
    if (user.x?.access_token) platforms.push("x");

    console.log(`[Scheduler] Firing recurring campaign ${campaign._id} to platforms:`, platforms);

    for (const platform of platforms) {
      try {
        await schedulePost({
          user_id: new Types.ObjectId(user._id.toString()),
          platform,
          content: finalContent,
          media_urls: [],
          media_type: "text",
          hashtags: ["#campaign"],
          scheduled_at: new Date(Date.now() + 5000), // Minor offset
          page_id: platform === "facebook" ? user.facebook?.project_id : undefined,
        });
      } catch (e) {
        console.error(`Failed to propagate campaign post for ${platform}`, e);
      }
    }
    return { success: true, message: "Campaign generated localized scheduled posts." };
  }

  const { scheduledPostId, platform, userId, content, mediaUrls, hashtags, pageId, channelId, platformSpecificData } = job.data;

  // Update status to processing
  await ScheduledPostModel.findByIdAndUpdate(scheduledPostId, {
    status: "processing",
  });

  let platformResponse: any;
  let platformPostId: string | undefined;

  try {
    // Post to the appropriate platform
    switch (platform) {
      case "facebook":
        platformResponse = await postToFacebook({
          userId,
          pageId: pageId!,
          message: content,
          mediaUrls,
          hashtags,
        });
        platformPostId = platformResponse?.id;
        break;

      case "instagram":
        platformResponse = await postToInstagram({
          userId,
          message: content,
          mediaUrls,
          hashtags,
        });
        platformPostId = platformResponse?.id;
        break;

      case "youtube":
        platformResponse = await postToYoutube({
          userId,
          title: platformSpecificData?.title || content.slice(0, 100),
          description: content,
          videoUrl: mediaUrls?.[0] || "",
          tags: hashtags,
          privacyStatus: platformSpecificData?.privacyStatus || "public",
          thumbnailDataUrl: platformSpecificData?.thumbnailDataUrl,
        });
        platformPostId = platformResponse?.id;
        break;

      case "x":
        platformResponse = await postToX({
          userId,
          message: content,
          mediaUrls,
          hashtags,
        });
        platformPostId = platformResponse?.data?.id;
        break;

      default:
        throw new Error(`Unknown platform: ${platform}`);
    }

    // Update scheduled post status to completed
    await ScheduledPostModel.findByIdAndUpdate(scheduledPostId, {
      status: "completed",
    });

    // Create posted content record
    const scheduledPost = await ScheduledPostModel.findById(scheduledPostId);
    await PostedContentModel.create({
      user_id: new Types.ObjectId(userId),
      scheduled_post_id: new Types.ObjectId(scheduledPostId),
      platform,
      content,
      media_urls: mediaUrls,
      media_type: mediaUrls?.length ? (mediaUrls[0]?.includes("video") ? "video" : "image") : "text",
      hashtags,
      posted_at: new Date(),
      platform_post_id: platformPostId,
      platform_response: platformResponse,
      page_id: pageId,
      channel_id: channelId,
      is_scheduled: true,
      status: "published",
    });

    return { success: true, platformResponse };
  } catch (error: any) {
    // Update scheduled post with error
    const retryCount = (job.attemptsMade || 0) + 1;
    const maxRetries = job.opts.attempts || 3;

    await ScheduledPostModel.findByIdAndUpdate(scheduledPostId, {
      status: retryCount >= maxRetries ? "failed" : "pending",
      error_message: error.message,
      retry_count: retryCount,
    });

    // If max retries reached, create failed posted content record
    if (retryCount >= maxRetries) {
      await PostedContentModel.create({
        user_id: new Types.ObjectId(userId),
        scheduled_post_id: new Types.ObjectId(scheduledPostId),
        platform,
        content,
        media_urls: mediaUrls,
        hashtags,
        posted_at: new Date(),
        is_scheduled: true,
        status: "failed",
        error_message: error.message,
      });
    }

    throw error;
  }
};

// Initialize Worker
export const initializeWorker = async (): Promise<Worker<SocialMediaJobData> | null> => {
  return new Promise((resolve) => {
    try {
      // Test Redis connection first using ioredis directly
      const testConnection = new Redis({
        host: REDIS_CONFIG.host,
        port: REDIS_CONFIG.port,
        password: REDIS_CONFIG.password,
        maxRetriesPerRequest: 1,
        retryStrategy: () => null, // Don't retry
        lazyConnect: true,
        enableOfflineQueue: false,
      });

      // Suppress error events on test connection - we handle them in catch
      testConnection.on("error", () => { });

      testConnection.connect()
        .then(async () => {
          await testConnection.ping();
          await testConnection.quit();

          isRedisAvailable = true;
          console.log("\x1b[32m[Redis] Connection successful\x1b[0m");

          // Initialize the actual queue
          socialMediaQueue = new Queue<SocialMediaJobData>(
            QUEUE_NAMES.SOCIAL_MEDIA_POST,
            {
              connection: REDIS_CONFIG,
              defaultJobOptions: DEFAULT_JOB_OPTIONS,
            }
          );

          // Initialize queue events
          queueEvents = new QueueEvents(QUEUE_NAMES.SOCIAL_MEDIA_POST, {
            connection: REDIS_CONFIG,
          });

          // Global error tracker for QueueEvents
          queueEvents.on("error", (err) => {
            console.error(`[Scheduler] QueueEvents Error: ${err.message}`);
          });

          const worker = new Worker<SocialMediaJobData>(
            QUEUE_NAMES.SOCIAL_MEDIA_POST,
            async (job) => {
              if (job.data.platform) {
                console.log(`Processing job ${job.id} for platform ${job.data.platform}`);
              } else {
                console.log(`Processing job ${job.id} (${job.name})`);
              }
              return processPostJob(job);
            },
            {
              connection: REDIS_CONFIG,
              concurrency: 5,
            }
          );

          // Worker event handlers
          worker.on("error", (err: Error) => {
            console.error(`[Scheduler] Worker Error: ${err.message}`);
          });

          worker.on("completed", (job: Job<SocialMediaJobData>) => {
            console.log(`Job ${job?.id} completed successfully`);
          });

          worker.on("failed", (job: Job<SocialMediaJobData> | undefined, err: Error) => {
            console.error(`Job ${job?.id} failed with error:`, err.message);
          });

          worker.on("error", (err: Error) => {
            console.error("Worker error:", err.message);
          });

          resolve(worker);
        })
        .catch(() => {
          isRedisAvailable = false;
          testConnection.disconnect();
          console.warn("\x1b[33m[Redis] Not available - Scheduler features disabled. Start Redis to enable scheduling.\x1b[0m");
          resolve(null);
        });
    } catch (error: any) {
      isRedisAvailable = false;
      console.warn("\x1b[33m[Redis] Not available - Scheduler features disabled.\x1b[0m");
      resolve(null);
    }
  });
};

// Queue status helper
export const getQueueStatus = async () => {
  const queue = getQueue();
  if (!queue) {
    return {
      available: false,
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0
    };
  }

  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);

  return { available: true, waiting, active, completed, failed, delayed };
};

// Check if Redis/Scheduler is available
export const isSchedulerAvailable = () => isRedisAvailable;
