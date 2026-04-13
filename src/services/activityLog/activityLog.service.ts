import ActivityLogModel from "../../models/activityLog/activityLog.model";
import { ActivityType } from "../../types/interface/activityLog.interface";

interface LogActivityParams {
  company_object_id: string;
  actor_object_id: string;
  actor_name: string;
  activity_type: ActivityType;
  message: string;
  metadata?: Record<string, any>;
}

export const logActivity = async (params: LogActivityParams): Promise<void> => {
  try {
    await ActivityLogModel.create(params);
  } catch (error) {
    console.error("[ActivityLog] Failed to log activity:", error);
  }
};
