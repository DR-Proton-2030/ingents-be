import { model } from "mongoose";
import activityLogSchema from "./activityLog.schema";
import { IActivityLog } from "../../types/interface/activityLog.interface";

const ActivityLogModel = model<IActivityLog>("activity_logs", activityLogSchema);
export default ActivityLogModel;
