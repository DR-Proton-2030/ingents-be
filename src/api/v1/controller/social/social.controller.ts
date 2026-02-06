import { Request, Response } from "express";
import { fetchSocialMetrics } from "../../../../services/social/socialMetrics.service";

export const getSocialMetrics = async (req: Request, res: Response) => {
  try {
    const userId =
      (req.query.user_id as string) || (req.query.userId as string);

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "user_id is required",
      });
    }

    const { items, errors } = await fetchSocialMetrics(userId);

    if (!items.length && errors?.length) {
      return res.status(502).json({
        success: false,
        message: "Failed to retrieve social metrics",
        errors,
      });
    }

    return res.status(200).json({
      success: true,
      result: {
        metrics: items,
        errors: errors || [],
      },
    });
  } catch (error: any) {
    console.error("Error fetching social metrics:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error?.message || String(error),
    });
  }
};
