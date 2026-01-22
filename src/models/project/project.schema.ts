import { Schema } from "mongoose";
import { GENERAL_SCHEMA_OPTIONS } from "../../constants/model/schemaOption";
import SCHEMA_DEFINITION_PROPERTY from "../../constants/model/model.constant";
import { IProject } from "../../types/interface/project.interface";

export const projectSchema: Schema<IProject> = new Schema<IProject>(
  {
    name: SCHEMA_DEFINITION_PROPERTY.requiredString,
    detail: SCHEMA_DEFINITION_PROPERTY.requiredString,
    company_object_id: SCHEMA_DEFINITION_PROPERTY.requiredObjectId,
    created_by_user_object_id: SCHEMA_DEFINITION_PROPERTY.requiredObjectId,
  },
  {
    ...GENERAL_SCHEMA_OPTIONS,
  }
);
