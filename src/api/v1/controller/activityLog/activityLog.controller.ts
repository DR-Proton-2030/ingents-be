import { Request, Response } from "express";
import ActivityLogModel from "../../../../models/activityLog/activityLog.model";

// GET /api/v1/activity/get-activities?limit=10
export const getActivities = async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const limit = parseInt(req.query.limit as string) || 10;

    const activities = await ActivityLogModel.find({
      company_object_id: user.company_object_id,
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return res.status(200).json({ message: "Activities fetched", data: activities });
  } catch (error: any) {
    console.error("getActivities error:", error);
    return res.status(500).json({ message: "Failed to fetch activities", error: error.message });
  }
};
