import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

export interface NormalizedContentMetrics {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  impressions: number;
  reach: number;
  watch_time_minutes: number;
  avg_view_duration: number;
  saves: number;
  retweets: number;
  quotes: number;
  bookmarks: number;
}

const defaultMetrics: NormalizedContentMetrics = {
  views: 0,
  likes: 0,
  comments: 0,
  shares: 0,
  impressions: 0,
  reach: 0,
  watch_time_minutes: 0,
  avg_view_duration: 0,
  saves: 0,
  retweets: 0,
  quotes: 0,
  bookmarks: 0,
};

/**
 * Fetch metrics for a YouTube video
 */
export const fetchYouTubeContentMetrics = async (
  videoId: string,
  accessToken: string
): Promise<NormalizedContentMetrics> => {
  try {
    const { data } = await axios.get(
      "https://www.googleapis.com/youtube/v3/videos",
      {
        params: {
          part: "statistics",
          id: videoId,
          access_token: accessToken,
        },
      }
    );

    const stats = data.items?.[0]?.statistics;
    if (!stats) return { ...defaultMetrics };

    return {
      ...defaultMetrics,
      views: parseInt(stats.viewCount || "0", 10),
      likes: parseInt(stats.likeCount || "0", 10),
      comments: parseInt(stats.commentCount || "0", 10),
      shares: 0, // YouTube doesn't expose share count via API
    };
  } catch (error: any) {
    console.error(`[MetricsFetcher] YouTube error for ${videoId}:`, error.message);
    return { ...defaultMetrics };
  }
};

/**
 * Fetch metrics for a Facebook post
 */
export const fetchFacebookContentMetrics = async (
  postId: string,
  pageAccessToken: string
): Promise<NormalizedContentMetrics> => {
  try {
    const { data } = await axios.get(
      `https://graph.facebook.com/v20.0/${postId}`,
      {
        params: {
          fields:
            "likes.summary(true),comments.summary(true),shares",
          access_token: pageAccessToken,
        },
      }
    );

    const likes = data.likes?.summary?.total_count || 0;
    const comments = data.comments?.summary?.total_count || 0;
    const shares = data.shares?.count || 0;

    // Try to fetch post insights for impressions/reach
    let impressions = 0;
    let reach = 0;
    try {
      const insightsRes = await axios.get(
        `https://graph.facebook.com/v20.0/${postId}/insights`,
        {
          params: {
            metric: "post_impressions,post_impressions_unique",
            access_token: pageAccessToken,
          },
        }
      );
      const insightsData = insightsRes.data?.data || [];
      for (const metric of insightsData) {
        if (metric.name === "post_impressions") {
          impressions = metric.values?.[0]?.value || 0;
        }
        if (metric.name === "post_impressions_unique") {
          reach = metric.values?.[0]?.value || 0;
        }
      }
    } catch {
      // Insights may not be available for all post types
    }

    return {
      ...defaultMetrics,
      likes,
      comments,
      shares,
      impressions,
      reach,
    };
  } catch (error: any) {
    console.error(`[MetricsFetcher] Facebook error for ${postId}:`, error.message);
    return { ...defaultMetrics };
  }
};

/**
 * Fetch metrics for an Instagram media post
 */
export const fetchInstagramContentMetrics = async (
  mediaId: string,
  accessToken: string
): Promise<NormalizedContentMetrics> => {
  try {
    // Basic media fields
    const { data: mediaData } = await axios.get(
      `https://graph.instagram.com/${mediaId}`,
      {
        params: {
          fields: "like_count,comments_count",
          access_token: accessToken,
        },
      }
    );

    const likes = mediaData.like_count || 0;
    const comments = mediaData.comments_count || 0;

    // Try insights (requires business/creator account)
    let impressions = 0;
    let reach = 0;
    let saves = 0;
    let shares = 0;
    try {
      const { data: insightsData } = await axios.get(
        `https://graph.instagram.com/${mediaId}/insights`,
        {
          params: {
            metric: "impressions,reach,saved,shares",
            access_token: accessToken,
          },
        }
      );
      for (const metric of insightsData.data || []) {
        if (metric.name === "impressions") impressions = metric.values?.[0]?.value || 0;
        if (metric.name === "reach") reach = metric.values?.[0]?.value || 0;
        if (metric.name === "saved") saves = metric.values?.[0]?.value || 0;
        if (metric.name === "shares") shares = metric.values?.[0]?.value || 0;
      }
    } catch {
      // Insights may not be available
    }

    return {
      ...defaultMetrics,
      likes,
      comments,
      shares,
      impressions,
      reach,
      saves,
    };
  } catch (error: any) {
    console.error(`[MetricsFetcher] Instagram error for ${mediaId}:`, error.message);
    return { ...defaultMetrics };
  }
};

/**
 * Fetch metrics for an X (Twitter) tweet
 */
export const fetchXContentMetrics = async (
  tweetId: string,
  accessToken: string
): Promise<NormalizedContentMetrics> => {
  try {
    const { data } = await axios.get(
      `https://api.twitter.com/2/tweets/${tweetId}`,
      {
        params: {
          "tweet.fields": "public_metrics",
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const metrics = data.data?.public_metrics;
    if (!metrics) return { ...defaultMetrics };

    return {
      ...defaultMetrics,
      views: metrics.impression_count || 0,
      likes: metrics.like_count || 0,
      comments: metrics.reply_count || 0,
      retweets: metrics.retweet_count || 0,
      quotes: metrics.quote_count || 0,
      bookmarks: metrics.bookmark_count || 0,
      impressions: metrics.impression_count || 0,
    };
  } catch (error: any) {
    console.error(`[MetricsFetcher] X error for ${tweetId}:`, error.message);
    return { ...defaultMetrics };
  }
};

/**
 * Fetch content metrics for any platform
 */
export const fetchContentMetrics = async (
  platform: string,
  platformPostId: string,
  accessToken: string
): Promise<NormalizedContentMetrics> => {
  switch (platform) {
    case "youtube":
      return fetchYouTubeContentMetrics(platformPostId, accessToken);
    case "facebook":
      return fetchFacebookContentMetrics(platformPostId, accessToken);
    case "instagram":
      return fetchInstagramContentMetrics(platformPostId, accessToken);
    case "x":
      return fetchXContentMetrics(platformPostId, accessToken);
    default:
      console.warn(`[MetricsFetcher] Unknown platform: ${platform}`);
      return { ...defaultMetrics };
  }
};
