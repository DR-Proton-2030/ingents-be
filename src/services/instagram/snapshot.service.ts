import UserModel from "../../models/users/users.model";
import SocialDataModel from "../../models/socialData/socialData.model";
import { buildInstagramDashboardBuilder } from "./dashboard.builder";

export const fetchAndStoreInstagramData = async (userId: string) => {
  try {
    const user = await UserModel.findById(userId).exec();
    if (!user || !user.instagram?.access_token || !user.instagram?.project_id) {
      throw new Error("Instagram access token or Business ID not found for user.");
    }

    const igUserId = user.instagram.project_id;
    const resultData = await buildInstagramDashboardBuilder(
      igUserId,
      user.instagram.access_token
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const historyEntry = {
      date: today,
      impressions: resultData.insights.views.total || 0,
      reach: resultData.insights.accountsReached || 0,
      profile_views: resultData.insights.profileActivity.profileVisits || 0,
      follower_count: resultData.overview.followersCount || 0,
    };

    // Surgical update: We update specific sub-fields to preserve 'data.insights_history'
    await SocialDataModel.findOneAndUpdate(
      { 
        user_object_id: userId, 
        platform_name: "instagram_business" 
      },
      {
        $set: {
          platform_id: igUserId,
          "data.overview": resultData.overview,
          "data.content": resultData.content,
          "data.audience": resultData.audience,
          "data.insights": resultData.insights,
          "data.summary": resultData.summary,
          is_active: true,
          last_synced_at: new Date(),
          updatedAt: new Date(),
        },
        $addToSet: {
          "data.insights_history": historyEntry
        }
      },
      { upsert: true, new: true }
    );

    return resultData;
  } catch (error: any) {
    console.error(`[SnapshotService] Sync failed for user ${userId}:`, error.message);
    throw error;
  }
};

export const getSnapshot = async (userId: string, platform: string = "instagram_business") => {
  return await SocialDataModel.findOne({ user_object_id: userId, platform_name: platform });
};
