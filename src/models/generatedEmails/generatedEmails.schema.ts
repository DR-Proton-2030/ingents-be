import { Schema } from "mongoose";
import { IGeneratedEmails } from "../../types/interface/generatedEmails.interface";
import SCHEMA_DEFINITION_PROPERTY from "../../constants/model/model.constant";
import { GENERAL_SCHEMA_OPTIONS } from "../../constants/model/schemaOption";

export const generatedEmailsSchema: Schema<IGeneratedEmails> =
  new Schema<IGeneratedEmails>(
    {
      userId: SCHEMA_DEFINITION_PROPERTY.requiredObjectId,
      uploaded_company_id: SCHEMA_DEFINITION_PROPERTY.requiredString,
      email_sub: SCHEMA_DEFINITION_PROPERTY.requiredString,
      email_body: SCHEMA_DEFINITION_PROPERTY.requiredString,
      date : { type: Date, default: Date.now }
    },
    {
      ...GENERAL_SCHEMA_OPTIONS,
      toJSON: { virtuals: true },
      toObject: { virtuals: true },
    }
  );
