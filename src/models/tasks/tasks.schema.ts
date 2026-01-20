import mongoose, { Schema, VirtualTypeOptions } from "mongoose";
import { GENERAL_SCHEMA_OPTIONS } from "../../constants/model/schemaOption";
import SCHEMA_DEFINITION_PROPERTY from "../../constants/model/model.constant";
import { Task } from "../../types/interface/task.interface";
import { IUser } from "../../types/interface/user.interface";
import { ITaskPhase } from "../../types/interface/taskPhase.interface";

export const taskSchema: Schema<Task> = new Schema<Task>(
  {
    title: SCHEMA_DEFINITION_PROPERTY.requiredString,
    completed: SCHEMA_DEFINITION_PROPERTY.requiredBoolean,
    description: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
    parent_task_object_id: SCHEMA_DEFINITION_PROPERTY.optionalNullObjectId,
    due_date: SCHEMA_DEFINITION_PROPERTY.optionalNullDate,
    priority: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
    progress: SCHEMA_DEFINITION_PROPERTY.requiredNumber,
    subtaskCount: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
    commentCount: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
    phase_object_id: SCHEMA_DEFINITION_PROPERTY.requiredObjectId,
    completed_by_user_object_id:
      SCHEMA_DEFINITION_PROPERTY.optionalNullObjectId,
    completed_at: SCHEMA_DEFINITION_PROPERTY.optionalNullDate,
    created_by_user_object_id: SCHEMA_DEFINITION_PROPERTY.requiredObjectId,
    company_object_id: SCHEMA_DEFINITION_PROPERTY.requiredObjectId,
    assigned_user_list: {
      type: [{ type: Schema.Types.ObjectId, ref: "User" }],
      default: [],
    },
  },
  {
    ...GENERAL_SCHEMA_OPTIONS,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

const UserVirtualReference: VirtualTypeOptions<IUser> = {
  ref: "users",
  localField: "assigned_user_list",
  foreignField: "_id",
  justOne: false,
};

taskSchema.virtual("assigned_users_info", UserVirtualReference);

const TaskPhaseVirtualReference: VirtualTypeOptions<ITaskPhase> = {
  ref: "TaskPhase",
  localField: "phase_object_id",
  foreignField: "_id",
  justOne: true,
};

taskSchema.virtual("phase_info", TaskPhaseVirtualReference);
