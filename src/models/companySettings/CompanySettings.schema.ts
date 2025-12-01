import { Schema } from "mongoose";
import SCHEMA_DEFINITION_PROPERTY from "../../constants/model/model.constant";
import { GENERAL_SCHEMA_OPTIONS } from "../../constants/model/schemaOption";
import { IEmailTemplate } from "../../types/interface/emailTemplate.interface";
import { ICompanySettings } from "../../types/interface/companySettings.interface";

const companySettingsSchema: Schema<ICompanySettings> = new Schema<ICompanySettings>(
  {
    company_object_id: SCHEMA_DEFINITION_PROPERTY.requiredObjectId,
    agents: SCHEMA_DEFINITION_PROPERTY.optionalArray,
    content: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
    embedding: SCHEMA_DEFINITION_PROPERTY.optionalArray,
    language: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
    tags: SCHEMA_DEFINITION_PROPERTY.optionalArray,
    metadata: {
      type: Schema.Types.Mixed,
      required: false,
      default: {}
    },
  },
  {
    ...GENERAL_SCHEMA_OPTIONS,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

export default companySettingsSchema;
