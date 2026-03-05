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
  postId: string,
  accessToken: string
) => {
  try {
    // 1. Fetch basic media data
    const { data: mediaData } = await axios.get(`${BASE_URL}/${postId}`, {
      params: {
        fields: "id,caption,media_type,media_product_type,media_url,permalink,timestamp,like_count,comments_count",
        access_token: accessToken,
      }
    });

    // 2. Fetch insights
    const isReel = mediaData.media_product_type === "REELS";
    
    // As of API v22.0, "views" is preferred over "impressions"
    const metrics = isReel 
      ? "reach,saved,shares,total_interactions"
      : "views,reach,saved,total_interactions";

    let insightsData = null;
    try {
      const { data } = await axios.get(`${BASE_URL}/${postId}/insights`, {
        params: {
          metric: metrics,
          access_token: accessToken,
        }
      });
      insightsData = data.data;
    } catch (err: any) {
      // If combined fail, try basic ones
      console.warn(`Insights failed for ${postId}, trying basic metrics:`, err.response?.data || err.message);
      try {
        const fallbackMetrics = "reach,saved";
        const { data } = await axios.get(`${BASE_URL}/${postId}/insights`, {
          params: {
            metric: fallbackMetrics,
            access_token: accessToken,
          }
        });
        insightsData = data.data;
      } catch (innerErr) {
         console.warn(`Fallback insights also failed for ${postId}`);
      }
    }

    return {
      postId,
      media: mediaData,
      insights: insightsData ? insightsData.map((item: any) => ({
        name: item.name,
        period: item.period,
        values: item.values
      })) : [],
    };
  } catch (error: any) {
    console.error("Error fetching Instagram post analytics:", error.response?.data || error.message);
    throw new Error("Failed to fetch Instagram post analytics");
  }
};

export const getInstagramAccountInsightsService = async (
  igUserId: string,
  accessToken: string
) => {
  try {
    const dailyMetrics = "views,reach,profile_views,follower_count";
    const lifetimeMetrics = "follower_demographics";

    // 1. Fetch Profile info (always good to have total counts)
    const profile = await getInstagramProfile(igUserId, accessToken).catch(
      () => null
    );

    // For daily insights, we can request a range (last 30 days)
    const until = Math.floor(Date.now() / 1000);
    const since = until - 30 * 24 * 60 * 60;

    const [dailyTotalRes, breakdownMediaRes, breakdownFollowRes, dailySeriesRes] = await Promise.all([
      // 1. Metrics that require metric_type=total_value
      axios
        .get(`${BASE_URL}/${igUserId}/insights`, {
          params: {
            metric: "views,reach,profile_views,total_interactions",
            period: "day",
            metric_type: "total_value",
            since,
            until,
            access_token: accessToken,
          },
        })
        .catch((err) => {
          console.error("Daily Totals error:", err.response?.data || err.message);
          return { data: { data: [] } };
        }),
      // 2. Media Product Type Breakdown
      axios
        .get(`${BASE_URL}/${igUserId}/insights`, {
          params: {
            metric: "views,reach,total_interactions",
            period: "day",
            metric_type: "total_value",
            breakdown: "media_product_type",
            since,
            until,
            access_token: accessToken,
          },
        })
        .catch(() => ({ data: { data: [] } })),
      // 3. Follow Type Breakdown
      axios
        .get(`${BASE_URL}/${igUserId}/insights`, {
          params: {
            metric: "views,reach,total_interactions",
            period: "day",
            metric_type: "total_value",
            breakdown: "follow_type",
            since,
            until,
            access_token: accessToken,
          },
        })
        .catch(() => ({ data: { data: [] } })),
      // 4. Metrics that are strictly time-series (like follower_count)
      axios
        .get(`${BASE_URL}/${igUserId}/insights`, {
          params: {
            metric: "follower_count",
            period: "day",
            since,
            until,
            access_token: accessToken,
          },
        })
        .catch((err) => {
          console.error("Daily Series error:", err.response?.data || err.message);
          return { data: { data: [] } };
        }),
    ]);
    // 4. Fetch Audience Demographics (Individual breakdowns for reliability)
    let processedAudience: any = {};
    try {
      const breakdownNames = ["city", "country", "gender", "age"];
      const demoResponses = await Promise.all(
        breakdownNames.map((b) =>
          axios
            .get(`${BASE_URL}/${igUserId}/insights`, {
              params: {
                metric: "follower_demographics",
                period: "lifetime",
                metric_type: "total_value",
                breakdown: b,
                access_token: accessToken,
              },
            })
            .catch((err) => {
              console.warn(
                `[InstagramService] Demographic ${b} failed:`,
                err.response?.data || err.message
              );
              return { data: { data: [] } };
            })
        )
      );

      demoResponses.forEach((res, idx) => {
        const dimension = breakdownNames[idx];
        const items = res.data?.data || [];
        items.forEach((item: any) => {
          const results = item.total_value?.breakdowns?.[0]?.results;
          if (results) {
            if (!processedAudience[dimension]) processedAudience[dimension] = {};
            results.forEach((r: any) => {
              const label = Object.values(r.dimension_values || {})[0] as string;
              if (label) processedAudience[dimension][label] = r.value;
            });
          } else if (item.values?.[0]?.value) {
            processedAudience[dimension] = item.values[0].value;
          }
        });
      });
    } catch (err: any) {
      console.warn("Demographics fetch failed entirely:", err.message);
    }

    const dailyData = [
      ...(dailyTotalRes.data?.data || []),
      ...(dailySeriesRes.data?.data || []),
    ];

    // Helper to extract breakdown value
    const getBreakdownVal = (metricData: any, dimensionValue: string) => {
      const breakdown = metricData?.total_value?.breakdowns?.[0];
      if (!breakdown) return 0;
      const result = breakdown.results?.find((r: any) => 
        r.dimension_values?.includes(dimensionValue) || 
        Object.values(r.dimension_values || {}).includes(dimensionValue)
      );
      return result?.value || 0;
    };

    // Calculate sum for summary (handling both total_value and values array)
    const summary: any = {};
    dailyData.forEach((metric: any) => {
      let sum = 0;
      if (metric.total_value) {
        sum = metric.total_value.value || 0;
      } else if (Array.isArray(metric.values)) {
        sum = metric.values.reduce((acc: number, v: any) => acc + (v.value || 0), 0);
      }
      summary[metric.name] = sum;
    });

    const detailedInsights: any = {
      views: { total: summary.views || 0, followersPercentage: 0, nonFollowersPercentage: 0 },
      accountsReached: summary.reach || 0,
      reachByContentType: { posts: 0, stories: 0, reels: 0 },
      interactions: { total: summary.total_interactions || 0, followersPercentage: 0, nonFollowersPercentage: 0 },
      interactionsByContentType: { posts: 0, reels: 0, stories: 0 },
    };

    // Process Media Type Breakdowns
    if (breakdownMediaRes.data?.data) {
      breakdownMediaRes.data.data.forEach((metric: any) => {
        const reels = getBreakdownVal(metric, "REELS");
        const stories = getBreakdownVal(metric, "STORY");
        const feed = getBreakdownVal(metric, "FEED");

        if (metric.name === "reach") {
          detailedInsights.reachByContentType.reels = reels;
          detailedInsights.reachByContentType.stories = stories;
          detailedInsights.reachByContentType.posts = feed;
        }
        if (metric.name === "total_interactions") {
          detailedInsights.interactionsByContentType.reels = reels;
          detailedInsights.interactionsByContentType.stories = stories;
          detailedInsights.interactionsByContentType.posts = feed;
        }
      });
    }

    // Process Follow Type Breakdowns
    if (breakdownFollowRes.data?.data) {
      breakdownFollowRes.data.data.forEach((metric: any) => {
        const followers = getBreakdownVal(metric, "FOLLOWER");
        const nonFollowers = getBreakdownVal(metric, "NON_FOLLOWER");
        const total = followers + nonFollowers;
        
        if (total > 0) {
          const fPerc = Math.round((followers / total) * 100);
          const nfPerc = 100 - fPerc;

          if (metric.name === "views") {
            detailedInsights.views.followersPercentage = fPerc;
            detailedInsights.views.nonFollowersPercentage = nfPerc;
          }
          if (metric.name === "total_interactions") {
            detailedInsights.interactions.followersPercentage = fPerc;
            detailedInsights.interactions.nonFollowersPercentage = nfPerc;
          }
        }
      });
    }

    // Results are already processed into processedAudience above

    return {
      profile: profile
        ? {
            followersCount: profile.followers_count || 0,
            followsCount: profile.follows_count || 0,
            mediaCount: profile.media_count || 0,
            username: profile.username,
            name: profile.name,
            profile_picture_url: profile.profile_picture_url,
          }
        : null,
      daily: dailyData,
      audience: {
        followers: profile?.followers_count || 0,
        demographics: processedAudience,
      },
      summary,
      detailedInsights,
      note: Object.keys(processedAudience).length === 0 ? "Audience demographics may require at least 100 followers." : null,
    };
  } catch (error: any) {
    console.error(
      "Account insights service error:",
      error.response?.data || error.message
    );
    return {
      daily: [],
      audience: {},
      summary: {},
      note: "Failed to fetch account insights service.",
    };
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
