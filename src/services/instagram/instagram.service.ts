import axios from "axios";
import dotenv from "dotenv";
import { InstagramPostParams } from "../../types/interface/instagramService.interface";

dotenv.config({ override: true });

const INSTAGRAM_CLIENT_ID = process.env.INSTAGRAM_CLIENT_ID!;
const INSTAGRAM_CLIENT_SECRET = process.env.INSTAGRAM_CLIENT_SECRET!;
const REDIRECT_URI = process.env.INSTAGRAM_REDIRECT_URI!;

export const getInstagramAuthURL = (userId: string) => {
  const redirectUriEncoded = encodeURIComponent(REDIRECT_URI);
  const stateEncoded = btoa(userId); // encode userId to base64

  return `https://www.instagram.com/oauth/authorize?force_reauth=true&client_id=${INSTAGRAM_CLIENT_ID}&redirect_uri=${redirectUriEncoded}&response_type=code&scope=instagram_business_basic%2Cinstagram_business_manage_messages%2Cinstagram_business_manage_comments%2Cinstagram_business_content_publish%2Cinstagram_business_manage_insights&state=${stateEncoded}`;
};

export const getInstagramUser = async (code: string) => {
  console.log("Called with code:", code);

  const tokenUrl = `https://api.instagram.com/oauth/access_token`;

  try {
    const { data } = await axios.post(
      tokenUrl,
      new URLSearchParams({
        client_id: INSTAGRAM_CLIENT_ID,
        client_secret: INSTAGRAM_CLIENT_SECRET,
        grant_type: "authorization_code",
        redirect_uri: REDIRECT_URI,
        code,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const accessToken = data.access_token;
    console.log("Instagram access_token:", accessToken);

    // Optionally fetch user details using Graph API
    // const userResponse = await axios.get(
    //   `https://graph.facebook.com/me?fields=id,username&access_token=${accessToken}`
    // );
    // console.log("User info:", userResponse.data);

    return {
      tokens: {
        access_token: accessToken,
      },
      // user: userResponse.data,
    };
  } catch (error: any) {
    console.error(
      "Error fetching Instagram token:",
      error.response?.data || error.message
    );
    throw error;
  }
};

export const getInstagramProfile = async (accessToken: string) => {
  try {
    const url = `https://graph.instagram.com/me`;
    const params = {
      fields: "id,username,name,account_type,profile_picture_url,followers_count,follows_count,media_count",
      access_token: accessToken,
    };

    const { data } = await axios.get(url, { params });

    return data;
  } catch (error: any) {
    console.error(
      "Error fetching Instagram profile:",
      error.response?.data || error.message
    );
    throw new Error("Failed to fetch Instagram profile");
  }
};

// Get Long Lived Token
export const getInstagramLongLivedToken = async (shortLivedToken: string) => {
  try {
    const url = "https://graph.instagram.com/access_token";

    const params = {
      grant_type: "ig_exchange_token",
      client_secret: INSTAGRAM_CLIENT_SECRET,
      access_token: shortLivedToken,
    };

    const { data } = await axios.get(url, { params });

    return {
      access_token: data.access_token,
      token_type: data.token_type,
      expires_in: data.expires_in,
    };
  } catch (error: any) {
    console.error(
      "Error exchanging long-lived token:",
      error.response?.data || error.message
    );
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
  if (!imageUrl && !videoUrl) {
    throw new Error("imageUrl or videoUrl is required to create a media container");
  }

  try {
    const url = `https://graph.instagram.com/v18.0/${igUserId}/media`;
    const body: any = {
      caption,
      media_type: mediaType,
    };
    if (mediaType === "VIDEO" || mediaType === "REELS") {
      body.video_url = videoUrl || imageUrl;
    } else {
      body.image_url = imageUrl;
    }

    const { data } = await axios.post(url, body, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    // Returns the container ID
    return data;
  } catch (error: any) {
    console.error(
      "Error creating Instagram media:",
      error.response?.data || error.message
    );
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
    const url = `https://graph.instagram.com/v18.0/${containerId}`;
    const { data } = await axios.get(url, {
      params: {
        fields: "status_code",
        access_token: accessToken,
      },
    });
    return data;
  } catch (error: any) {
    console.error(
      "Error fetching Instagram media status:",
      error.response?.data || error.message
    );
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
    const url = `https://graph.instagram.com/v18.0/${igUserId}/media_publish`;
    const body = {
      creation_id: containerId,
    };

    const { data } = await axios.post(url, body, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    return data; // Returns the published post ID
  } catch (error: any) {
    console.error(
      "Error publishing Instagram media:",
      error.response?.data || error.message
    );
    throw new Error("Failed to publish Instagram media");
  }
};

export const getSinglePostAnalyticsService = async (
  postId: string,
  accessToken: string
) => {
  try {
    // 1. Fetch basic media data (like_count, comments_count, etc.)
    // We try without the version prefix first as it's more flexible
    const mediaUrl = `https://graph.instagram.com/${postId}?fields=id,media_type,media_product_type,media_url,permalink,thumbnail_url,timestamp,caption,like_count,comments_count&access_token=${accessToken}`;
    const { data: mediaData } = await axios.get(mediaUrl);

    // 2. Fetch insights based on media type
    let metrics = "impressions,reach,saved,engagement";
    
    if (mediaData.media_product_type === 'REELS') {
      // Removing 'plays' as it's causing IGApiException for some Reel types
      metrics = "comments,likes,reach,saved,shares,total_interactions";
    } else if (mediaData.media_type === 'CAROUSEL_ALBUM') {
      metrics = "carousel_album_engagement,carousel_album_impressions,carousel_album_reach,carousel_album_saved,carousel_album_video_views";
    } else if (mediaData.media_type === 'VIDEO') {
      metrics = "impressions,reach,saved,engagement,video_views";
    }

    const insightsUrl = `https://graph.instagram.com/${postId}/insights?metric=${metrics}&access_token=${accessToken}`;
    
    let insightsData = null;
    let insightsError = null;
    try {
      const { data } = await axios.get(insightsUrl);
      insightsData = data.data; 
    } catch (err: any) {
      insightsError = err.response?.data || err.message;
      console.warn("Post Insights fetch failed:", insightsError);
    }

    return {
      media: mediaData,
      insights: insightsData ? insightsData.map((item: any) => ({
        name: item.name,
        period: item.period,
        values: item.values
      })) : null,
      insights_error: insightsError // Return error for debugging
    };
  } catch (error: any) {
    console.error("Error fetching Instagram single post analytics:", error.response?.data || error.message);
    throw new Error("Failed to fetch Instagram single post analytics");
  }
};

export const getInstagramAccountInsightsService = async (
  igUserId: string,
  accessToken: string
) => {
  try {
    // Fetch account-level insights and demographics
    // Note: demographics are 'lifetime' metrics, while others are 'day'
    const dailyMetrics = "impressions,reach,profile_views,follower_count";
    const lifetimeMetrics = "audience_city,audience_country,audience_gender_age";

    const dailyUrl = `https://graph.instagram.com/${igUserId}/insights?metric=${dailyMetrics}&period=day&access_token=${accessToken}`;
    const lifetimeUrl = `https://graph.instagram.com/${igUserId}/insights?metric=${lifetimeMetrics}&period=lifetime&access_token=${accessToken}`;

    const [dailyRes, lifetimeRes] = await Promise.all([
      axios.get(dailyUrl).catch(err => {
        console.warn("Daily insights failed:", err.response?.data || err.message);
        return { data: { data: [] } };
      }),
      axios.get(lifetimeUrl).catch(err => {
        const errorData = err.response?.data?.error;
        console.warn("Lifetime insights failed:", errorData || err.message);
        // Special case: Audience data requires at least 100 followers
        if (errorData?.code === 10 || errorData?.message?.includes('100 followers')) {
          return { data: { data: [], note: "Audience demographics require at least 100 followers." } };
        }
        return { data: { data: [] } };
      })
    ]);

    return {
      daily: dailyRes.data.data,
      audience: lifetimeRes.data.data,
      note: (lifetimeRes.data as any).note || null
    };
  } catch (error: any) {
    console.error("Account insights service error:", error.response?.data || error.message);
    return null;
  }
};
