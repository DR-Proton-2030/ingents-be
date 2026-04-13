import { Schema } from "mongoose";
import SCHEMA_DEFINITION_PROPERTY from "../../constants/model/model.constant";
import { GENERAL_SCHEMA_OPTIONS } from "../../constants/model/schemaOption";
import { ITodo } from "../../types/interface/todo.interface";

const todoSchema: Schema<ITodo> = new Schema<ITodo>(
  {
    user_object_id: SCHEMA_DEFINITION_PROPERTY.requiredObjectId,
    company_object_id: SCHEMA_DEFINITION_PROPERTY.requiredObjectId,
    text: SCHEMA_DEFINITION_PROPERTY.requiredString,
    completed: SCHEMA_DEFINITION_PROPERTY.optionalBoolean,
    date: SCHEMA_DEFINITION_PROPERTY.requiredString, // YYYY-MM-DD
  },
  {
    ...GENERAL_SCHEMA_OPTIONS,
  }
);

todoSchema.index({ user_object_id: 1, date: 1 });

export default todoSchema;
