import { Schema } from "mongoose";
import SCHEMA_DEFINITION_PROPERTY from "../../constants/model/model.constant";
import { GENERAL_SCHEMA_OPTIONS } from "../../constants/model/schemaOption";
import { IProjectAutomation } from "../../types/interface/projectAutomation.interface";

export const projectAutomationSchema: Schema<IProjectAutomation> = new Schema<IProjectAutomation>(
  {
    project_object_id: SCHEMA_DEFINITION_PROPERTY.requiredObjectId,
    company_object_id: SCHEMA_DEFINITION_PROPERTY.requiredObjectId,
    created_by_user_object_id: SCHEMA_DEFINITION_PROPERTY.requiredObjectId,
    automation_type: SCHEMA_DEFINITION_PROPERTY.requiredString,
    is_active: SCHEMA_DEFINITION_PROPERTY.optionalBoolean,
    project_context: SCHEMA_DEFINITION_PROPERTY.requiredString,
    github_repo_owner: SCHEMA_DEFINITION_PROPERTY.requiredString,
    github_repo_name: SCHEMA_DEFINITION_PROPERTY.requiredString,
    github_webhook_secret: SCHEMA_DEFINITION_PROPERTY.requiredString,
    trello_list_id: SCHEMA_DEFINITION_PROPERTY.requiredString,
  },
  {
    ...GENERAL_SCHEMA_OPTIONS,
  }
);

projectAutomationSchema.index(
  { project_object_id: 1, automation_type: 1 },
  { unique: true }
);
