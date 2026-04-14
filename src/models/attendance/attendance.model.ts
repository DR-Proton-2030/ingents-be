import { model, Model } from "mongoose";
import { IAttendance } from "../../types/interface/attendance.interface";
import attendanceSchema from "./attendance.schema";

const AttendanceModel: Model<IAttendance> = model<IAttendance>(
  "attendances",
  attendanceSchema
);

export default AttendanceModel;
