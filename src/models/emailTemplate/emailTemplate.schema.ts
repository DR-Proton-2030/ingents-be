import { Schema } from "mongoose";
import SCHEMA_DEFINITION_PROPERTY from "../../constants/model/model.constant";
import { GENERAL_SCHEMA_OPTIONS } from "../../constants/model/schemaOption";
import { IEmailTemplate } from "../../types/interface/emailTemplate.interface";

const emailTemplateSchema: Schema<IEmailTemplate> = new Schema<IEmailTemplate>(
  {
    template_name: SCHEMA_DEFINITION_PROPERTY.requiredString,
    category: SCHEMA_DEFINITION_PROPERTY.requiredString,
    price: SCHEMA_DEFINITION_PROPERTY.requiredString,
    created_by: SCHEMA_DEFINITION_PROPERTY.requiredString,
    privet: SCHEMA_DEFINITION_PROPERTY.requiredString,
    body: SCHEMA_DEFINITION_PROPERTY.requiredString,
    subject: SCHEMA_DEFINITION_PROPERTY.requiredString,
  },
  {
    ...GENERAL_SCHEMA_OPTIONS,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

export default emailTemplateSchema;
