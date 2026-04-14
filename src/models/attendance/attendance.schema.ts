import { Schema } from "mongoose";
import SCHEMA_DEFINITION_PROPERTY from "../../constants/model/model.constant";
import { GENERAL_SCHEMA_OPTIONS } from "../../constants/model/schemaOption";
import { IAttendance } from "../../types/interface/attendance.interface";

const attendanceSchema: Schema<IAttendance> = new Schema<IAttendance>(
  {
    user_object_id: SCHEMA_DEFINITION_PROPERTY.requiredObjectId,
    company_object_id: SCHEMA_DEFINITION_PROPERTY.requiredObjectId,
    date: SCHEMA_DEFINITION_PROPERTY.requiredString,
  },
  {
    ...GENERAL_SCHEMA_OPTIONS,
  }
);

// Indexes to speed up queries by company/user and date
attendanceSchema.index({ company_object_id: 1, date: -1 });
attendanceSchema.index({ user_object_id: 1, date: 1 }, { unique: true });

export default attendanceSchema;
