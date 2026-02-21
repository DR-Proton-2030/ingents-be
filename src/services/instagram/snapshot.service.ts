import UserModel from "../../models/users/users.model";
import SocialDataModel from "../../models/socialData/socialData.model";
import { buildInstagramDashboardBuilder } from "./dashboard.builder";

export const fetchAndStoreInstagramData = async (userId: string) => {
  try {
    const user = await UserModel.findById(userId).exec();
    if (!user || !user.instagram?.access_token) {
      throw new Error("Instagram access token not found for user.");
    }

    const igUserId = user.instagram.project_id || "me";
    const resultData = await buildInstagramDashboardBuilder(
      igUserId,
      user.instagram.access_token
    );

    await SocialDataModel.findOneAndUpdate(
      { user_object_id: userId, platform_name: "instagram", platform_id: igUserId },
      {
        $set: {
          data: resultData,
          is_active: true,
          last_synced_at: new Date(),
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );

    return resultData;
  } catch (error: any) {
    console.error("Error in fetchAndStoreInstagramData:", error);
    throw error;
  }
};

export const getSnapshot = async (userId: string, platform: string = "instagram") => {
  return await SocialDataModel.findOne({ user_object_id: userId, platform_name: platform });
};
