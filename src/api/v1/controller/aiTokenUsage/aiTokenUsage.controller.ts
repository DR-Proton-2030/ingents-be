import { Request, Response } from "express";
import AITokenUsageModel from "../../../../models/aiTokenUsage/aiTokenUsage.model";
import UserModel from "../../../../models/users/users.model";
import SubscriptionModel from "../../../../models/subscription/subscription.model";
import { PLAN_CONFIG, SubscriptionPlan } from "../../../../types/interface/subscription.interface";

// Token limits per plan
const PLAN_TOKEN_LIMITS: Record<string, number> = {
  free: 5000,
  pro: 50000,
  pro_plus: 500000,
};

export const getAITokenUsage = async (req: Request, res: Response) => {
  try {
    const { company_object_id } = req.user;

    const usages = await AITokenUsageModel.find({ company_object_id }).lean();

    // Aggregate by user
    const usageByUser: { [key: string]: number } = {};
    let totalTokens = 0;

    usages.forEach(usage => {
      totalTokens += usage.tokens_used;
      const userIdStr = usage.user_object_id.toString();
      if (!usageByUser[userIdStr]) {
        usageByUser[userIdStr] = 0;
      }
      usageByUser[userIdStr] += usage.tokens_used;
    });

    // Fetch user details for all users who have usage
    const userIds = Object.keys(usageByUser);
    const users = await UserModel.find(
      { _id: { $in: userIds } },
      { full_name: 1, profile_picture: 1 }
    ).lean();

    const userMap: Record<string, { full_name: string; profile_picture: string | null }> = {};
    users.forEach((user: any) => {
      userMap[user._id.toString()] = {
        full_name: user.full_name || "Unknown",
        profile_picture: user.profile_picture || null,
      };
    });

    // Build enriched usage data
    const usageByUserEnriched = Object.entries(usageByUser).map(([userId, tokens]) => ({
      userId,
      tokens,
      full_name: userMap[userId]?.full_name || "Unknown",
      profile_picture: userMap[userId]?.profile_picture || null,
    }));

    // Get token limit from subscription
    let tokenLimit = PLAN_TOKEN_LIMITS.free;
    const subscription = await SubscriptionModel.findOne({ company_id: company_object_id }).lean();
    if (subscription) {
      const plan = (subscription as any).plan as string;
      tokenLimit = PLAN_TOKEN_LIMITS[plan] || PLAN_TOKEN_LIMITS.free;
    }

    res.status(200).json({
      success: true,
      data: {
        totalTokens,
        tokenLimit,
        usageByUser: usageByUserEnriched
      }
    });
  } catch (error) {
    console.error("Error fetching AI token usage:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
