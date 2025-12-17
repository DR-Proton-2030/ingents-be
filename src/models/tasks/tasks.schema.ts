import { Schema } from "mongoose";
import { GENERAL_SCHEMA_OPTIONS } from "../../constants/model/schemaOption";
import SCHEMA_DEFINITION_PROPERTY from "../../constants/model/model.constant";
import { IChatMessage } from "../../types/interface/message.interface";
import { Task } from "../../types/interface/task.interface";

export const taskSchema: Schema<Task> =
  new Schema<Task>(
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
        status: SCHEMA_DEFINITION_PROPERTY.requiredString,
        completed_by_user_object_id: SCHEMA_DEFINITION_PROPERTY.optionalNullObjectId,
        completed_at: SCHEMA_DEFINITION_PROPERTY.optionalNullDate,
        created_by_user_object_id: SCHEMA_DEFINITION_PROPERTY.requiredObjectId,
        company_object_id: SCHEMA_DEFINITION_PROPERTY.requiredObjectId,
    },
    {
      ...GENERAL_SCHEMA_OPTIONS,
      toJSON: { virtuals: true },
      toObject: { virtuals: true },
    }
  );