import { Request, Response } from "express";
import AITokenUsageModel from "../../../../models/aiTokenUsage/aiTokenUsage.model";

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

    res.status(200).json({
      success: true,
      data: {
        totalTokens,
        usageByUser
      }
    });
  } catch (error) {
    console.error("Error fetching AI token usage:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
