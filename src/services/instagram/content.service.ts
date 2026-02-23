import axios from "axios";
import PostedContentModel from "../../models/postedContent/postedContent.model";
import UserModel from "../../models/users/users.model";

interface PostAnalytics {
  likes: number;
  comments: number;
  shares: number;
  views: number;
}

export async function getIgPostAnalytics(
  mediaId: string,
  accessToken: string,
): Promise<PostAnalytics> {
  try {
    let likes = 0;
    let comments = 0;
    let shares = 0;
    let views = 0;

    const { data: mediaData } = await axios.get(
      `https://graph.instagram.com/${mediaId}`,
      {
        params: {
          fields: "like_count,comments_count",
          access_token: accessToken,
        },
      }
    );

    likes = mediaData.like_count || 0;
    comments = mediaData.comments_count || 0;

    // For views (impressions) and shares
    try {
      const { data: insightsRes } = await axios.get(
        `https://graph.instagram.com/${mediaId}/insights`,
        {
          params: {
            metric: "impressions,reach,shares,plays",
            access_token: accessToken,
          },
        }
      );
      if (insightsRes && insightsRes.data) {
        insightsRes.data.forEach((metric: any) => {
          if (metric.name === "impressions" || metric.name === "plays") {
             views = Math.max(views, metric.values?.[0]?.value || 0);
          }
          if (metric.name === "shares") {
             shares = metric.values?.[0]?.value || 0;
          }
        });
      }
    } catch (e) {
      // Not all media types support insights (e.g., standard images might not support 'plays' or 'shares')
      // Or might be deprecated in some graph versions natively, we silently catch.
    }

    return { likes, comments, shares, views };

  } catch (err: any) {
    console.error(`IG Graph API error for ${mediaId}:`, err.response?.data || err.message);
    throw err;
  }
}

/**
 * Finds all Instagram posts in PostedContentModel for a user,
 * fetches their latest engagement metrics, and updates the database.
 */
export async function updateInstagramAllPostsEngagement(userId: string) {
  try {
    const user = await UserModel.findById(userId).exec();
    if (!user || !user.instagram?.access_token) {
      console.log(`No Instagram access token for user ${userId}`);
      return;
    }

    const accessToken = user.instagram.access_token;

    const posts = await PostedContentModel.find({
      user_id: userId,
      platform: "instagram",
      status: "published",
      platform_post_id: { $ne: null },
    });

    if (!posts.length) {
      console.log(`No Instagram posts found for user ${userId}`);
      return;
    }

    for (const post of posts) {
      try {
        const postId = post.platform_post_id!;
        const analytics = await getIgPostAnalytics(postId, accessToken);

        await PostedContentModel.findByIdAndUpdate(post._id, {
          $set: {
            engagement: {
              likes: analytics.likes,
              comments: analytics.comments,
              shares: analytics.shares,
              views: analytics.views,
            },
          },
        });
      } catch (postErr: any) {
        console.error(
          `Failed to update engagement for IG post ${post.platform_post_id}:`,
          postErr.message,
        );
      }
    }

    console.log(`Successfully updated engagement for ${posts.length} Instagram posts`);
  } catch (err: any) {
    console.error("Error in updateInstagramAllPostsEngagement:", err);
    throw err;
  }
}
