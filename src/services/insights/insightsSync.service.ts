import { Queue, Worker, Job } from "bullmq";
import { Redis } from "ioredis";
import axios from "axios";
import { REDIS_CONFIG } from "../../config/redis.config";
import UserModel from "../../models/users/users.model";
import PostedContentModel from "../../models/postedContent/postedContent.model";
import ContentMetricsSnapshotModel from "../../models/contentMetricsSnapshot/contentMetricsSnapshot.model";
import PlatformInsightsSnapshotModel from "../../models/platformInsightsSnapshot/platformInsightsSnapshot.model";
import { fetchContentMetrics } from "./metricsFetcher";
import { fetchAccountInsights } from "./accountInsightsFetcher";

const QUEUE_NAME = "insights-sync-queue";
const PLATFORMS = ["youtube", "facebook", "instagram", "x"] as const;

// Debounce map: userId -> last sync timestamp
const lastSyncMap = new Map<string, number>();
const SYNC_DEBOUNCE_MS = 30 * 60 * 1000; // 30 minutes

let isRedisAvailable = false;
let insightsQueue: Queue | null = null;
let insightsWorker: Worker | null = null;

const getQueue = (): Queue | null => {
  if (!isRedisAvailable) return null;
  if (!insightsQueue) {
    insightsQueue = new Queue(QUEUE_NAME, {
      connection: REDIS_CONFIG,
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: "exponential", delay: 10000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    });
    // Add global error handler to prevent unhandled error event noise
    insightsQueue.on("error", (err) => {
      console.error(`[InsightsSync] Queue Error: ${err.message}`);
    });
  }
  return insightsQueue;
};

/**
 * Sync content metrics for a specific user
 * - Finds all published posts from last 90 days with a platform_post_id
 * - Fetches latest metrics from each platform
 * - Creates snapshot + updates PostedContent.engagement
 */
const syncContentMetricsForUser = async (userId: string) => {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  const posts = await PostedContentModel.find({
    user_id: userId,
    status: "published",
    platform_post_id: { $ne: null, $exists: true },
    posted_at: { $gte: ninetyDaysAgo },
  }).lean();

  if (!posts.length) return;

  const user = await UserModel.findById(userId).lean();
  if (!user) return;

  for (const post of posts) {
    const platformData = (user as any)[post.platform];
    if (!platformData?.access_token) continue;

    // For Facebook posts, we may need a page token
    let accessToken = platformData.access_token;

    if (post.platform === "facebook") {
      const pageId = post.page_id || platformData.project_id;
      if (pageId) {
        try {
          const pagesRes = await axios.get(
            "https://graph.facebook.com/v20.0/me/accounts",
            {
              params: {
                fields: "id,access_token",
                access_token: platformData.access_token,
              },
            }
          );

          const pageData = pagesRes.data?.data?.find((p: any) => p.id === pageId);
          if (pageData?.access_token) {
            accessToken = pageData.access_token;
          }
        } catch (error: any) {
          console.warn(
            `[InsightsSync] Could not resolve Facebook page token for page ${pageId}:`,
            error.message
          );
        }
      }
    }

    try {
      const metrics = await fetchContentMetrics(
        post.platform,
        post.platform_post_id!,
        accessToken
      );

      // Create snapshot
      await ContentMetricsSnapshotModel.create({
        user_id: userId,
        posted_content_id: post._id,
        platform: post.platform,
        platform_post_id: post.platform_post_id,
        snapshot_at: new Date(),
        metrics,
      });

      // Update PostedContent with latest engagement
      await PostedContentModel.findByIdAndUpdate(post._id, {
        $set: {
          engagement: {
            likes: metrics.likes,
            comments: metrics.comments,
            shares: metrics.shares,
            views: metrics.views,
          },
          last_metrics_sync: new Date(),
        },
      });

      console.log(
        `[InsightsSync] Updated metrics for ${post.platform} post ${post.platform_post_id}`
      );
    } catch (error: any) {
      console.error(
        `[InsightsSync] Failed to sync ${post.platform} post ${post.platform_post_id}:`,
        error.message
      );
    }
  }
};

/**
 * Sync account-level insights for a specific user
 */
const syncAccountInsightsForUser = async (userId: string) => {
  const user = await UserModel.findById(userId).lean();
  if (!user) return;

  for (const platform of PLATFORMS) {
    const platformData = (user as any)[platform];
    if (!platformData?.access_token) continue;

    try {
      const insights = await fetchAccountInsights(platform, userId);

      await PlatformInsightsSnapshotModel.create({
        user_id: userId,
        platform,
        snapshot_at: new Date(),
        account_metrics: {
          followers: insights.followers,
          total_views: insights.total_views,
          total_posts: insights.total_posts,
          profile_views: insights.profile_views,
        },
        period_metrics: {
          new_followers: insights.new_followers,
          lost_followers: insights.lost_followers,
          impressions: insights.impressions,
          reach: insights.reach,
          engagement_rate: insights.engagement_rate,
        },
      });

      console.log(`[InsightsSync] Stored ${platform} account insights for user ${userId}`);
    } catch (error: any) {
      console.error(
        `[InsightsSync] Failed account sync for ${platform}:`,
        error.message
      );
    }
  }
};

/**
 * Process a sync job
 */
const processJob = async (job: Job) => {
  const { type, userId } = job.data;

  console.log(`[InsightsSync] Processing job: ${type} for user ${userId || "all"}`);

  if (type === "sync-content-metrics") {
    if (userId) {
      await syncContentMetricsForUser(userId);
    } else {
      // Sync all users with connected platforms
      const users = await UserModel.find({
        $or: [
          { "youtube.access_token": { $ne: null, $exists: true } },
          { "facebook.access_token": { $ne: null, $exists: true } },
          { "instagram.access_token": { $ne: null, $exists: true } },
          { "x.access_token": { $ne: null, $exists: true } },
        ],
      })
        .select("_id")
        .lean();

      for (const user of users) {
        await syncContentMetricsForUser(user._id.toString());
      }
    }
  } else if (type === "sync-account-insights") {
    if (userId) {
      await syncAccountInsightsForUser(userId);
    } else {
      const users = await UserModel.find({
        $or: [
          { "youtube.access_token": { $ne: null, $exists: true } },
          { "facebook.access_token": { $ne: null, $exists: true } },
          { "instagram.access_token": { $ne: null, $exists: true } },
          { "x.access_token": { $ne: null, $exists: true } },
        ],
      })
        .select("_id")
        .lean();

      for (const user of users) {
        await syncAccountInsightsForUser(user._id.toString());
      }
    }
  }
};

/**
 * Initialize the insights sync worker and repeatable cron jobs
 */
export const initializeInsightsWorker = async (): Promise<Worker | null> => {
  try {
    // Test Redis connection
    const testConn = new Redis({
      ...REDIS_CONFIG,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null, // Don't retry inside the test
      enableOfflineQueue: false,
    });

    // Suppress unhandled error events for the test connection
    testConn.on("error", () => {});

    await testConn.connect();
    await testConn.ping();
    await testConn.quit();

    isRedisAvailable = true;
    console.log("[InsightsSync] Redis connection verified");

    const queue = getQueue();
    if (!queue) return null;

    // Set up repeatable cron jobs
    // Content metrics: every 6 hours
    await queue.add(
      "sync-content-metrics-cron",
      { type: "sync-content-metrics" },
      {
        repeat: { pattern: "0 */6 * * *" }, // Every 6 hours
        jobId: "content-metrics-cron",
      }
    );

    // Account insights: every 24 hours at midnight
    await queue.add(
      "sync-account-insights-cron",
      { type: "sync-account-insights" },
      {
        repeat: { pattern: "0 0 * * *" }, // Daily at midnight
        jobId: "account-insights-cron",
      }
    );

    console.log("[InsightsSync] Repeatable cron jobs registered");

    // Create worker
    insightsWorker = new Worker(QUEUE_NAME, processJob, {
      connection: REDIS_CONFIG,
      concurrency: 2, // Limit concurrency to avoid rate limits
    });

    // Add global error handler to prevent unhandled error event noise
    insightsWorker.on("error", (err) => {
      console.error(`[InsightsSync] Worker Error: ${err.message}`);
    });

    insightsWorker.on("completed", (job) => {
      console.log(`[InsightsSync] Job ${job.id} completed`);
    });

    insightsWorker.on("failed", (job, err) => {
      console.error(`[InsightsSync] Job ${job?.id} failed:`, err.message);
    });

    return insightsWorker;
  } catch (error: any) {
    console.warn("[InsightsSync] Redis not available, sync disabled:", error.message);
    isRedisAvailable = false;
    return null;
  }
};

/**
 * Trigger an on-demand sync for a specific user (debounced)
 */
export const triggerUserSync = async (userId: string): Promise<boolean> => {
  const lastSync = lastSyncMap.get(userId) || 0;
  if (Date.now() - lastSync < SYNC_DEBOUNCE_MS) {
    console.log(`[InsightsSync] Debounced sync for user ${userId}`);
    return false;
  }

  const queue = getQueue();
  if (!queue) {
    // Fallback: run directly without queue if Redis is unavailable
    console.log("[InsightsSync] Running sync directly (no Redis)");
    await syncContentMetricsForUser(userId);
    await syncAccountInsightsForUser(userId);
    lastSyncMap.set(userId, Date.now());
    return true;
  }

  await queue.add("on-demand-content", {
    type: "sync-content-metrics",
    userId,
  });
  await queue.add("on-demand-account", {
    type: "sync-account-insights",
    userId,
  });

  lastSyncMap.set(userId, Date.now());
  return true;
};

/**
 * Get the latest metrics summary for a user across all platforms
 */
export const getLatestInsightsSummary = async (userId: string) => {
  // Latest account insights per platform
  const accountSnapshots = await PlatformInsightsSnapshotModel.aggregate([
    { $match: { user_id: userId } },
    { $sort: { snapshot_at: -1 } },
    {
      $group: {
        _id: "$platform",
        latest: { $first: "$$ROOT" },
      },
    },
  ]);

  // Latest content metrics per post
  const contentSnapshots = await ContentMetricsSnapshotModel.aggregate([
    { $match: { user_id: userId } },
    { $sort: { snapshot_at: -1 } },
    {
      $group: {
        _id: "$posted_content_id",
        latest: { $first: "$$ROOT" },
      },
    },
    { $limit: 50 },
  ]);

  // Aggregate totals
  const totals = {
    total_views: 0,
    total_likes: 0,
    total_comments: 0,
    total_shares: 0,
    total_followers: 0,
  };

  for (const snap of accountSnapshots) {
    totals.total_followers += snap.latest.account_metrics?.followers || 0;
    totals.total_views += snap.latest.account_metrics?.total_views || 0;
  }

  for (const snap of contentSnapshots) {
    totals.total_likes += snap.latest.metrics?.likes || 0;
    totals.total_comments += snap.latest.metrics?.comments || 0;
    totals.total_shares += snap.latest.metrics?.shares || 0;
  }

  return {
    platforms: accountSnapshots.map((s: any) => ({
      platform: s._id,
      ...s.latest.account_metrics,
      ...s.latest.period_metrics,
      snapshot_at: s.latest.snapshot_at,
    })),
    recent_content: contentSnapshots.map((s: any) => ({
      posted_content_id: s._id,
      platform: s.latest.platform,
      metrics: s.latest.metrics,
      snapshot_at: s.latest.snapshot_at,
    })),
    totals,
  };
};

/**
 * Graceful shutdown
 */
export const shutdownInsightsSync = async () => {
  if (insightsWorker) {
    await insightsWorker.close();
    console.log("[InsightsSync] Worker shut down");
  }
  if (insightsQueue) {
    await insightsQueue.close();
    console.log("[InsightsSync] Queue shut down");
  }
};
