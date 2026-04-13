import { Schema } from "mongoose";
import SCHEMA_DEFINITION_PROPERTY from "../../constants/model/model.constant";
import { GENERAL_SCHEMA_OPTIONS } from "../../constants/model/schemaOption";
import { IActivityLog } from "../../types/interface/activityLog.interface";

const activityLogSchema: Schema<IActivityLog> = new Schema<IActivityLog>(
  {
    company_object_id: SCHEMA_DEFINITION_PROPERTY.requiredObjectId,
    actor_object_id: SCHEMA_DEFINITION_PROPERTY.requiredObjectId,
    actor_name: SCHEMA_DEFINITION_PROPERTY.requiredString,
    activity_type: SCHEMA_DEFINITION_PROPERTY.requiredString,
    message: SCHEMA_DEFINITION_PROPERTY.requiredString,
    metadata: SCHEMA_DEFINITION_PROPERTY.optionalNullObject,
  },
  {
    ...GENERAL_SCHEMA_OPTIONS,
  }
);

activityLogSchema.index({ company_object_id: 1, createdAt: -1 });

export default activityLogSchema;
