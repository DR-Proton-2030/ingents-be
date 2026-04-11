import axios from "axios";
import UserModel from "../../models/users/users.model";

export interface NormalizedAccountInsights {
  followers: number;
  total_views: number;
  total_posts: number;
  profile_views: number;
  new_followers: number;
  lost_followers: number;
  impressions: number;
  reach: number;
  engagement_rate: number;
}

const defaultInsights: NormalizedAccountInsights = {
  followers: 0,
  total_views: 0,
  total_posts: 0,
  profile_views: 0,
  new_followers: 0,
  lost_followers: 0,
  impressions: 0,
  reach: 0,
  engagement_rate: 0,
};

/**
 * Fetch YouTube channel-level insights
 */
export const fetchYouTubeAccountInsights = async (
  accessToken: string,
  channelId?: string
): Promise<NormalizedAccountInsights> => {
  try {
    const params: any = {
      part: "statistics",
      access_token: accessToken,
    };
    if (channelId) {
      params.id = channelId;
    } else {
      params.mine = true;
    }

    const { data } = await axios.get(
      "https://www.googleapis.com/youtube/v3/channels",
      { params }
    );

    const stats = data.items?.[0]?.statistics;
    if (!stats) return { ...defaultInsights };

    return {
      ...defaultInsights,
      followers: parseInt(stats.subscriberCount || "0", 10),
      total_views: parseInt(stats.viewCount || "0", 10),
      total_posts: parseInt(stats.videoCount || "0", 10),
    };
  } catch (error: any) {
    console.error("[AccountInsights] YouTube error:", error.message);
    return { ...defaultInsights };
  }
};

/**
 * Fetch Facebook page-level insights
 */
export const fetchFacebookAccountInsights = async (
  userAccessToken: string,
  pageId: string
): Promise<NormalizedAccountInsights> => {
  try {
    // Get page access token first
    const pagesRes = await axios.get(
      `https://graph.facebook.com/v20.0/me/accounts?fields=id,access_token&access_token=${userAccessToken}`
    );
    const pageData = pagesRes.data?.data?.find((p: any) => p.id === pageId);
    const pageToken = pageData?.access_token || userAccessToken;

    // Get basic page metrics
    const { data: pageInfo } = await axios.get(
      `https://graph.facebook.com/v20.0/${pageId}`,
      {
        params: {
          fields: "fan_count,followers_count",
          access_token: pageToken,
        },
      }
    );

    const followers = pageInfo.followers_count || pageInfo.fan_count || 0;

    // Try to get page insights
    let impressions = 0;
    let reach = 0;
    let newFollowers = 0;
    try {
      const { data: insights } = await axios.get(
        `https://graph.facebook.com/v20.0/${pageId}/insights`,
        {
          params: {
            metric: "page_impressions,page_impressions_unique,page_fan_adds_unique",
            period: "day",
            access_token: pageToken,
          },
        }
      );
      for (const metric of insights.data || []) {
        const val = metric.values?.[metric.values.length - 1]?.value || 0;
        if (metric.name === "page_impressions") impressions = val;
        if (metric.name === "page_impressions_unique") reach = val;
        if (metric.name === "page_fan_adds_unique") newFollowers = val;
      }
    } catch {
      // Page insights may require specific permissions
    }

    return {
      ...defaultInsights,
      followers,
      impressions,
      reach,
      new_followers: newFollowers,
    };
  } catch (error: any) {
    console.error("[AccountInsights] Facebook error:", error.message);
    return { ...defaultInsights };
  }
};

/**
 * Fetch Instagram account-level insights
 */
export const fetchInstagramAccountInsights = async (
  accessToken: string
): Promise<NormalizedAccountInsights> => {
  try {
    const { data } = await axios.get("https://graph.instagram.com/me", {
      params: {
        fields: "id,username,followers_count,media_count",
        access_token: accessToken,
      },
    });

    return {
      ...defaultInsights,
      followers: data.followers_count || 0,
      total_posts: data.media_count || 0,
    };
  } catch (error: any) {
    console.error("[AccountInsights] Instagram error:", error.message);
    return { ...defaultInsights };
  }
};

/**
 * Fetch X (Twitter) account-level insights
 */
export const fetchXAccountInsights = async (
  accessToken: string
): Promise<NormalizedAccountInsights> => {
  try {
    const { data } = await axios.get(
      "https://api.twitter.com/2/users/me",
      {
        params: {
          "user.fields": "public_metrics",
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const metrics = data.data?.public_metrics;
    if (!metrics) return { ...defaultInsights };

    return {
      ...defaultInsights,
      followers: metrics.followers_count || 0,
      total_posts: metrics.tweet_count || 0,
    };
  } catch (error: any) {
    console.error("[AccountInsights] X error:", error.message);
    return { ...defaultInsights };
  }
};

/**
 * Fetch account insights for any platform
 */
export const fetchAccountInsights = async (
  platform: string,
  userId: string
): Promise<NormalizedAccountInsights> => {
  const user = await UserModel.findById(userId);
  if (!user) return { ...defaultInsights };

  const platformData = (user as any)[platform];
  if (!platformData?.access_token) return { ...defaultInsights };

  switch (platform) {
    case "youtube":
      return fetchYouTubeAccountInsights(
        platformData.access_token,
        platformData.project_id
      );
    case "facebook":
      return fetchFacebookAccountInsights(
        platformData.access_token,
        platformData.project_id
      );
    case "instagram":
      return fetchInstagramAccountInsights(platformData.access_token);
    case "x":
      return fetchXAccountInsights(platformData.access_token);
    default:
      return { ...defaultInsights };
  }
};
