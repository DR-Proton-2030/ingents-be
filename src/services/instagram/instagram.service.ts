import axios from "axios";
import dotenv from "dotenv";
import { InstagramPostParams } from "../../types/interface/instagramService.interface";

dotenv.config({ override: true });

const INSTAGRAM_CLIENT_ID = process.env.FACEBOOK_CLIENT_ID!;
const INSTAGRAM_CLIENT_SECRET = process.env.FACEBOOK_CLIENT_SECRET!;
const REDIRECT_URI = process.env.INSTAGRAM_REDIRECT_URI!;

const BASE_URL = "https://graph.facebook.com/v22.0";

/**
 * Generate Auth URL for Instagram Business (via Facebook Login)
 */
export const getInstagramAuthURL = (userId: string) => {
  const state = btoa(userId);
  const scopes = [
    "instagram_basic",
    "instagram_manage_insights",
    "instagram_manage_comments",
    "instagram_content_publish",
    "pages_show_list",
    "pages_read_engagement",
    "pages_read_user_content",
    "pages_manage_metadata",
    "business_management"
  ].join(",");

  return `https://www.facebook.com/v22.0/dialog/oauth?client_id=${INSTAGRAM_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${scopes}&state=${state}&response_type=code&auth_type=rerequest`;
};

/**
 * Exchange Code for Token (Business API uses Facebook OAuth)
 */
export const getInstagramUser = async (code: string) => {
  try {
    const { data } = await axios.get(`${BASE_URL}/oauth/access_token`, {
      params: {
        client_id: INSTAGRAM_CLIENT_ID,
        client_secret: INSTAGRAM_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        code,
      },
    });

    return {
      tokens: {
        access_token: data.access_token,
      },
    };
  } catch (error: any) {
    console.error("Error fetching Instagram token:", error.response?.data || error.message);
    throw error;
  }
};

/**
 * Fetch Instagram Business Account ID from Facebook Token
 */
export const getInstagramBusinessAccountId = async (accessToken: string) => {
  try {
    // 0. Debug Permissions - Let's see what we actually got
    try {
      const { data: permData } = await axios.get(`${BASE_URL}/me/permissions`, {
        params: { access_token: accessToken }
      });
      console.log("[InstagramService] Token Permissions Status:", JSON.stringify(permData.data, null, 2));
    } catch (permErr) {
      console.warn("[InstagramService] Could not fetch permissions for debug.");
    }

    // 1. Fetch Pages
    const { data } = await axios.get(`${BASE_URL}/me/accounts`, {
      params: {
        fields: "instagram_business_account{id,username,name,profile_picture_url},name,is_published,access_token,category,tasks",
        access_token: accessToken,
        limit: 100,
      },
    });

    const pages = data.data || [];
    console.log(`[InstagramService] Total Facebook Pages found in token: ${pages.length}`);
    
    const debugInfo = pages.map((p: any) => ({
        name: p.name,
        id: p.id,
        category: p.category,
        tasks: p.tasks,
        hasLinkedIg: !!p.instagram_business_account,
        igAccount: p.instagram_business_account ? {
          id: p.instagram_business_account.id,
          username: p.instagram_business_account.username
        } : null
    }));

    console.log("[InstagramService] Pages detail (JSON):", JSON.stringify(debugInfo, null, 2));

    // 2. Try Standard Page Mapping
    const pagesWithIg = pages.filter((page: any) => page.instagram_business_account);
    if (pagesWithIg.length > 0) {
      console.log(`[InstagramService] Found linked IG via Pages: ${pagesWithIg[0].instagram_business_account.username}`);
      return pagesWithIg[0].instagram_business_account;
    }

    // 3. Try Direct Fallback (For accounts linked at User level)
    console.log("[InstagramService] No IG via Pages. Trying legacy fallback /me?fields=instagram_accounts...");
    try {
      const { data: directData } = await axios.get(`${BASE_URL}/me`, {
        params: {
          fields: "id,name,instagram_accounts{id,username,name,profile_picture_url}",
          access_token: accessToken,
        }
      });
      
      const igAccounts = directData.instagram_accounts?.data || [];
      if (igAccounts.length > 0) {
        console.log(`[InstagramService] Found IG via direct lookup: ${igAccounts[0].username}`);
        return igAccounts[0];
      }
    } catch (fallbackErr: any) {
      console.warn("[InstagramService] Legacy fallback failed.");
    }

    // 4. Try Newer Fallback
    console.log("[InstagramService] Trying fallback /me/instagram_accounts...");
    try {
      const { data: igDirectData } = await axios.get(`${BASE_URL}/me/instagram_accounts`, {
        params: {
          fields: "id,username,name,profile_picture_url",
          access_token: accessToken,
        }
      });
      
      const igAccounts = igDirectData.data || [];
      if (igAccounts.length > 0) {
        console.log(`[InstagramService] Found IG via /me/instagram_accounts: ${igAccounts[0].username}`);
        return igAccounts[0];
      }
    } catch (fallbackErr: any) {
      console.warn("[InstagramService] New fallback failed.");
    }

    // 5. Final Error with Debug Info
    const pageNames = pages.map((p: any) => p.name).join(", ") || "None";
    throw new Error(`Instagram connection failed. 
    Pages Detected: ${pageNames}.
    Instagram accounts selected in picker: please ensure you selected both the IG account AND the FB Page linked to it.
    Link verification: 
    1. Check Instagram Settings -> Account -> Sharing to other apps -> Facebook.
    2. Check Facebook Page Settings -> Linked Accounts -> Instagram.`);
  } catch (error: any) {
    const errorMsg = error.response?.data?.error?.message || error.message;
    console.error("Error in getInstagramBusinessAccountId:", errorMsg);
    throw new Error(errorMsg);
  }
};

export const getInstagramProfile = async (igUserId: string, accessToken: string) => {
  try {
    const { data } = await axios.get(`${BASE_URL}/${igUserId}`, {
      params: {
        fields: "id,username,name,followers_count,follows_count,media_count,profile_picture_url",
        access_token: accessToken,
      },
    });
    return data;
  } catch (error: any) {
    console.error("Error fetching Instagram profile:", error.response?.data || error.message);
    throw new Error("Failed to fetch Instagram profile");
  }
};

/**
 * Get Long-Lived Token for Business (via Facebook)
 */
export const getInstagramLongLivedToken = async (shortLivedToken: string) => {
  try {
    const { data } = await axios.get(`${BASE_URL}/oauth/access_token`, {
      params: {
        grant_type: "fb_exchange_token",
        client_id: INSTAGRAM_CLIENT_ID,
        client_secret: INSTAGRAM_CLIENT_SECRET,
        fb_exchange_token: shortLivedToken,
      },
    });

    return {
      access_token: data.access_token,
      token_type: data.token_type,
      expires_in: data.expires_in,
    };
  } catch (error: any) {
    console.error("Error exchanging long-lived token:", error.response?.data || error.message);
    throw new Error("Failed to get long-lived Instagram token");
  }
};

export const createInstagramMedia = async ({
  accessToken,
  igUserId,
  imageUrl,
  videoUrl,
  caption,
  mediaType = "IMAGE",
}: InstagramPostParams) => {
  try {
    const url = `${BASE_URL}/${igUserId}/media`;
    const payload: any = {
      caption,
      access_token: accessToken,
    };

    if (mediaType === "VIDEO" || mediaType === "REELS") {
      payload.media_type = "REELS";
      payload.video_url = videoUrl || imageUrl;
    } else {
      payload.image_url = imageUrl;
    }

    const { data } = await axios.post(url, payload);
    return data;
  } catch (error: any) {
    console.error("Error creating Instagram media:", error.response?.data || error.message);
    throw new Error("Failed to create Instagram media");
  }
};

export const getInstagramMediaStatus = async ({
  accessToken,
  containerId,
}: {
  accessToken: string;
  containerId: string;
}) => {
  try {
    const { data } = await axios.get(`${BASE_URL}/${containerId}`, {
      params: {
        fields: "status_code",
        access_token: accessToken,
      },
    });
    return data;
  } catch (error: any) {
    console.error("Error fetching Instagram media status:", error.response?.data || error.message);
    throw new Error("Failed to fetch Instagram media status");
  }
};

export const publishInstagramMedia = async ({
  accessToken,
  igUserId,
  containerId,
}: {
  accessToken: string;
  igUserId: string;
  containerId: string;
}) => {
  try {
    const { data } = await axios.post(`${BASE_URL}/${igUserId}/media_publish`, null, {
      params: {
        creation_id: containerId,
        access_token: accessToken,
      },
    });
    return data;
  } catch (error: any) {
    console.error("Error publishing Instagram media:", error.response?.data || error.message);
    throw new Error("Failed to publish Instagram media");
  }
};

export const getSinglePostAnalyticsService = async (
  mediaData: any,
  accessToken: string
) => {
  try {
    const postId = mediaData.id;
    const isReel = mediaData.media_product_type === "REELS";

    // Resilient Batch Fetcher: Falls back to individual metrics if batch fails
    const fetchBatchMetrics = async (mList: string[], params: any = {}) => {
      try {
        const { data } = await axios.get(`${BASE_URL}/${postId}/insights`, {
          params: { 
            metric: mList.join(","), 
            access_token: accessToken, 
            period: "lifetime",
            ...params 
          }
        });
        return data.data || [];
      } catch (e: any) {
        // If batch fails (often due to one unsupported metric), fetch individually in parallel
        const results = await Promise.all(mList.map(m => 
          axios.get(`${BASE_URL}/${postId}/insights`, {
            params: { 
              metric: m, 
              access_token: accessToken, 
              period: "lifetime",
              ...params 
            }
          }).then(res => res.data.data?.[0]).catch(() => null)
        ));
        return results.filter(r => r !== null);
      }
    };

    // Helper to extract metric from a list (Handles multiple response formats)
    const findMetric = (list: any[], m: string) => {
        const met = list.find((i: any) => i.name === m);
        if (!met) return null;
        
        // Format 1: { total_value: { value: X } }
        if (met.total_value && typeof met.total_value === 'object' && 'value' in met.total_value) {
            return met.total_value.value;
        }
        // Format 2: { values: [ { value: X } ] }
        if (Array.isArray(met.values) && met.values.length > 0 && 'value' in met.values[0]) {
            return met.values[0].value;
        }
        // Format 3: { total_value: X }
        if (met.total_value !== undefined && typeof met.total_value !== 'object') {
            return met.total_value;
        }
        // Format 4: { value: X }
        if (met.value !== undefined) {
            return met.value;
        }
        return 0;
    };

    // 2. Optimized Parallel Fetching: Single batch request for all possible metrics
    const allMetricList = [
      "reach", "saved", 
      "views", "total_interactions", "reposts", "video_views",
      ...(isReel ? ["shares", "ig_reels_avg_watch_time", "ig_reels_video_view_total_time"] : [])
    ];

    const combinedMetrics = await fetchBatchMetrics(allMetricList);

    // Extracting metrics with fallbacks
    const viewsMetric = findMetric(combinedMetrics, "views") || 0;
    const reach = findMetric(combinedMetrics, "reach") || 0;
    const saved = findMetric(combinedMetrics, "saved") || 0;
    const shares = findMetric(combinedMetrics, "shares") || 0;
    const reposts = findMetric(combinedMetrics, "reposts") || 0;
    const totalInter = findMetric(combinedMetrics, "total_interactions") || 0;
    const videoViewsInsight = findMetric(combinedMetrics, "video_views") || 0;
    
    // Watch time logic
    const avgWatchTime = (findMetric(combinedMetrics, "ig_reels_avg_watch_time") || 0) / 1000;
    const totalWatchTime = (findMetric(combinedMetrics, "ig_reels_video_view_total_time") || 0) / 1000;
    
    // Final mapping logic
    const views = viewsMetric || videoViewsInsight || 0;

    let finalInteractions = totalInter;
    if (!finalInteractions) {
      finalInteractions = (mediaData.like_count || 0) + (mediaData.comments_count || 0) + saved + (isReel ? shares : 0) + reposts;
    }

    return {
      media: {
        shortcode: mediaData.shortcode,
        thumbnail_url: mediaData.thumbnail_url,
        is_comment_enabled: mediaData.is_comment_enabled,
        is_shared_to_feed: mediaData.is_shared_to_feed,
      },
      overview: {
        views,
        reach: reach || 0,
        watch_time: totalWatchTime,
        avg_watch_time: avgWatchTime,
        interactions: finalInteractions,
      },
      interaction_counts: {
        shares: isReel ? shares : 0,
        reposts: reposts,
        saves: saved
      }
    };
  } catch (error: any) {
    console.error("Error fetching Instagram post analytics:", error.response?.data || error.message);
    throw new Error("Failed to fetch Instagram post analytics");
  }
};
/**
 * Fetch basic Facebook User Profile
 */
export const getFacebookUserProfile = async (accessToken: string) => {
  try {
    const { data } = await axios.get(`${BASE_URL}/me`, {
      params: {
        fields: "id,name,email",
        access_token: accessToken,
      },
    });
    return data;
  } catch (error: any) {
    console.error("Error fetching FB User profile:", error.response?.data || error.message);
    throw error;
  }
};
