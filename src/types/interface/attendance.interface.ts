import { Types } from "mongoose";

export interface IAttendance {
  user_object_id: Types.ObjectId;
  company_object_id: Types.ObjectId;
  date: string;
}
