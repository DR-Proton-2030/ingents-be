import { Request, Response } from "express";
import { generateAIContent } from "../../../../services/ai/ai.service";

export const generateContent = async (req: Request, res: Response) => {
  try {
    const { userId, companyId, context, feature } = req.body;

    if (!userId || !companyId || !context) {
      return res.status(400).json({
        success: false,
        message: "userId, companyId, and context are required",
      });
    }

    const content = await generateAIContent(userId, companyId, context, feature);

    return res.status(200).json({
      success: true,
      result: content,
    });
  } catch (error: any) {
    console.error("Error in AI generation controller:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};
