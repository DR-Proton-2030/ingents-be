import { Schema } from "mongoose";
import SCHEMA_DEFINITION_PROPERTY from "../../constants/model/model.constant";
import { GENERAL_SCHEMA_OPTIONS } from "../../constants/model/schemaOption";
import { ISentEmail } from "../../types/interface/sentEmail.interface";

const sentEmailSchema: Schema<ISentEmail> = new Schema<ISentEmail>(
  {
    MSG_id: SCHEMA_DEFINITION_PROPERTY.requiredString,
    company_id: SCHEMA_DEFINITION_PROPERTY.requiredString,
    user_id: SCHEMA_DEFINITION_PROPERTY.requiredString,
    quota_used: SCHEMA_DEFINITION_PROPERTY.requiredString,
    email_body: SCHEMA_DEFINITION_PROPERTY.requiredString,
    email_subject: SCHEMA_DEFINITION_PROPERTY.requiredString,
    purchased_email_template_id: SCHEMA_DEFINITION_PROPERTY.requiredString,
  },
  {
    ...GENERAL_SCHEMA_OPTIONS,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

export default sentEmailSchema;
