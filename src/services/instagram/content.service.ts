import axios from "axios";
import PostedContentModel from "../../models/postedContent/postedContent.model";
import UserModel from "../../models/users/users.model";

const BASE_URL = "https://graph.facebook.com/v20.0";

interface PostAnalytics {
  likes: number;
  comments: number;
  shares: number;
  views: number;
  saved: number;
}

/**
 * Fetch detailed analytics for a Business IG post (v20.0)
 */
export async function getIgPostAnalytics(
  mediaId: string,
  accessToken: string,
): Promise<PostAnalytics> {
  try {
    // 1. Fetch Basic Metrics
    const { data: mediaData } = await axios.get(`${BASE_URL}/${mediaId}`, {
      params: {
        fields: "like_count,comments_count,media_product_type",
        access_token: accessToken,
      },
    });

    // 2. Fetch Insights (Impressions, Reach, Saved, Shares)
    const isReel = mediaData.media_product_type === "REELS";
    const metric = isReel 
      ? "reach,saved,shares,total_interactions" 
      : "impressions,reach,saved,shares,total_interactions";

    let views = 0;
    let shares = 0;
    let saved = 0;

    try {
      const { data: insightsRes } = await axios.get(`${BASE_URL}/${mediaId}/insights`, {
        params: { metric, access_token: accessToken },
      });
      
      if (insightsRes && insightsRes.data) {
        insightsRes.data.forEach((item: any) => {
          const val = item.values?.[0]?.value || 0;
          if (item.name === "impressions" || item.name === "reach") views = Math.max(views, val);
          if (item.name === "shares") shares = val;
          if (item.name === "saved") saved = val;
        });
      }
    } catch (e: any) {
      console.warn(`[ContentService] Insights unavailable for IG post ${mediaId}`);
    }

    return { 
      likes: mediaData.like_count || 0, 
      comments: mediaData.comments_count || 0, 
      shares, 
      views,
      saved 
    };

  } catch (err: any) {
    console.error(`[ContentService] IG API error for ${mediaId}:`, err.response?.data || err.message);
    throw err;
  }
}

/**
 * Update engagement metrics for all published Instagram posts for a user
 */
export async function updateInstagramAllPostsEngagement(userId: string) {
  try {
    const user = await UserModel.findById(userId).exec();
    if (!user || !user.instagram?.access_token) {
      console.log(`[ContentService] No Instagram token for user ${userId}`);
      return;
    }

    const accessToken = user.instagram.access_token;
    const posts = await PostedContentModel.find({
      user_id: userId,
      platform: "instagram",
      status: "published",
      platform_post_id: { $ne: null },
    });

    if (!posts.length) return;

    // Use Promise.all for parallel processing for better performance
    await Promise.all(posts.map(async (post) => {
      try {
        const analytics = await getIgPostAnalytics(post.platform_post_id!, accessToken);
        
        await PostedContentModel.findByIdAndUpdate(post._id, {
          $set: {
            engagement: {
              likes: analytics.likes,
              comments: analytics.comments,
              shares: analytics.shares,
              views: analytics.views,
              saved: analytics.saved,
            },
          },
        });
      } catch (postErr: any) {
        console.warn(`[ContentService] Failed update for IG post ${post.platform_post_id}:`, postErr.message);
      }
    }));

    console.log(`[ContentService] Updated engagement for ${posts.length} IG posts for user ${userId}`);
  } catch (err: any) {
    console.error("[ContentService] Error in updateInstagramAllPostsEngagement:", err);
    throw err;
  }
}
