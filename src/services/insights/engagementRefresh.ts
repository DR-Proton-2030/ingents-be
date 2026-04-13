import axios from "axios";
import UserModel from "../../models/users/users.model";
import PostedContentModel from "../../models/postedContent/postedContent.model";
import { fetchContentMetrics } from "./metricsFetcher";

const REFRESH_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Refresh engagement metrics for a list of posted content records.
 * Called in background (fire-and-forget) when fetching posted content.
 * Only refreshes posts that haven't been synced in the last 30 minutes.
 */
export const refreshEngagementForPosts = async (
  userId: string,
  posts: any[]
): Promise<void> => {
  if (!posts || posts.length === 0) return;

  const now = Date.now();
  const stalePosts = posts.filter((p) => {
    if (!p.platform_post_id) return false;
    if (p.status !== "published") return false;
    const lastSync = p.last_metrics_sync
      ? new Date(p.last_metrics_sync).getTime()
      : 0;
    return now - lastSync > REFRESH_THRESHOLD_MS;
  });

  if (stalePosts.length === 0) return;

  const user = await UserModel.findById(userId).lean();
  if (!user) return;

  for (const post of stalePosts) {
    const platformData = (user as any)[post.platform];
    if (!platformData?.access_token) continue;

    let accessToken = platformData.access_token;

    // For Facebook posts, resolve the page access token
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
          const pageData = pagesRes.data?.data?.find(
            (p: any) => p.id === pageId
          );
          if (pageData?.access_token) {
            accessToken = pageData.access_token;
          }
        } catch (error: any) {
          console.warn(
            `[EngagementRefresh] Could not resolve FB page token for page ${pageId}:`,
            error.message
          );
          continue;
        }
      }
    }

    try {
      const metrics = await fetchContentMetrics(
        post.platform,
        post.platform_post_id,
        accessToken
      );

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
        `[EngagementRefresh] Updated ${post.platform} post ${post.platform_post_id} — likes:${metrics.likes} comments:${metrics.comments} shares:${metrics.shares}`
      );
    } catch (error: any) {
      console.error(
        `[EngagementRefresh] Failed ${post.platform} post ${post.platform_post_id}:`,
        error.message
      );
    }
  }
};
