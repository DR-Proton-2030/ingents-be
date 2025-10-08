import { Schema } from "mongoose";
import SCHEMA_DEFINITION_PROPERTY from "../../constants/model/model.constant";
import { GENERAL_SCHEMA_OPTIONS } from "../../constants/model/schemaOption";
import { IPurchasedEmailTemplate } from "../../types/interface/purchasedEmailTemplate.interface";

const purchasedEmailTemplateSchema: Schema<IPurchasedEmailTemplate> =
  new Schema<IPurchasedEmailTemplate>(
    {
      buyer_id: SCHEMA_DEFINITION_PROPERTY.requiredString,
      purchased_quota: SCHEMA_DEFINITION_PROPERTY.requiredNumber,
      quota_left: SCHEMA_DEFINITION_PROPERTY.requiredNumber,
    },
    {
      ...GENERAL_SCHEMA_OPTIONS,
      toJSON: { virtuals: true },
      toObject: { virtuals: true },
    }
  );

export default purchasedEmailTemplateSchema;
