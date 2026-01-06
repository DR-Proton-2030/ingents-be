import { Schema, VirtualTypeOptions } from "mongoose";
import { GENERAL_SCHEMA_OPTIONS } from "../../constants/model/schemaOption";
import SCHEMA_DEFINITION_PROPERTY from "../../constants/model/model.constant";
import { IAssignedTask } from "../../types/interface/assignedTask.interface";
import { IUser } from "../../types/interface/user.interface";

export const assignedTaskSchema: Schema<IAssignedTask> =
  new Schema<IAssignedTask>(
    {
        task_object_id: SCHEMA_DEFINITION_PROPERTY.requiredObjectId,
        assigned_to_user_object_id: SCHEMA_DEFINITION_PROPERTY.requiredObjectId,
        assigned_by_user_object_id: SCHEMA_DEFINITION_PROPERTY.requiredObjectId,
        company_object_id: SCHEMA_DEFINITION_PROPERTY.requiredObjectId,
        assigned_at: SCHEMA_DEFINITION_PROPERTY.requiredDate,
    },
    {
      ...GENERAL_SCHEMA_OPTIONS,
      toJSON: { virtuals: true },
      toObject: { virtuals: true },
    },
    
   
  );
   const UserVirtualReference: VirtualTypeOptions<IUser> = {
      ref: "users",
      localField: "assigned_to_user_object_id",
      foreignField: "_id",
      justOne: true,
    };

    assignedTaskSchema.virtual("user_details", UserVirtualReference);