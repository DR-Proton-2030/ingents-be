import { getPageTokenService } from "./facebook.service";
import { buildFacebookDashboardBuilder } from "./dashboard.builder";
import UserModel from "../../models/users/users.model";
import SocialDataModel from "../../models/socialData/socialData.model";
import PostedContentModel from "../../models/postedContent/postedContent.model";

/**
 * Fetch and store Facebook data for a user
 */
export const fetchAndStoreFacebookData = async (userId: string, pageId: string) => {
  try {
    const { pageAccessToken, id: resolvedPageId } = await getPageTokenService(
      userId,
      pageId,
    );
    const pid = resolvedPageId || pageId;

    // Use existing dashboard builder to fetch all metrics
    const resultData = await buildFacebookDashboardBuilder(
      pid,
      pageAccessToken,
      "28d",
    );

    // Update engagement for posted content if available
    if (resultData.content?.publishedContent) {
      await Promise.all(
        resultData.content.publishedContent.map(async (item: any) => {
          if (item.type === "video" && item.views !== undefined) {
             await PostedContentModel.findOneAndUpdate(
              { platform_post_id: item.id, platform: "facebook", user_id: userId },
              {
                $set: {
                  engagement: {
                    views: Number(item.views || 0),
                  },
                },
              },
            );
          }
        })
      );
    }

    // Update snapshot in SocialDataModel
    await SocialDataModel.findOneAndUpdate(
      { user_object_id: userId, platform_name: "facebook", platform_id: pid },
      {
        $set: {
          data: resultData,
          is_active: true,
          last_synced_at: new Date(),
          updatedAt: new Date(),
        },
      },
      { upsert: true },
    );

    return resultData;
  } catch (error: any) {
    console.error("Error in fetchAndStoreFacebookData:", error);
    throw error;
  }
};

/**
 * Daily cron to update snapshots for all connected Facebook users.
 */
// export const dailyFacebookSnapshotCron = async () => {
//   console.log("[FacebookSnapshotService] Starting daily Facebook snapshot cron...");
//   // Find users who have facebook connected and a project_id (pageId)
//   const users = await UserModel.find({ 
//       "facebook.access_token": { $ne: null },
//       "facebook.project_id": { $ne: null }
//     })
//     .select({ _id: 1, "facebook.project_id": 1 })
//     .lean();

//   for (const u of users as any[]) {
//     try {
//       console.log(`[FacebookSnapshotService] Syncing snapshot for user: ${u._id}`);
//       await fetchAndStoreFacebookData(u._id.toString(), u.facebook.project_id);
//     } catch (err: any) {
//       console.error(
//         `[FacebookSnapshotService] Failed to sync snapshot for user ${u._id}:`,
//         err.message,
//       );
//     }
//   }
//   console.log("[FacebookSnapshotService] Daily Facebook snapshot cron completed.");
// };

export const getSnapshot = async (userId: string, platform: string = "facebook") => {
  return await SocialDataModel.findOne({ user_object_id: userId, platform_name: platform });
};
