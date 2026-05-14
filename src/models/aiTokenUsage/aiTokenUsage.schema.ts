import { Schema } from "mongoose";
import SCHEMA_DEFINITION_PROPERTY from "../../constants/model/model.constant";
import { GENERAL_SCHEMA_OPTIONS } from "../../constants/model/schemaOption";
import { IAITokenUsage } from "../../types/interface/aiTokenUsage.interface";

export const aiTokenUsageSchema: Schema<IAITokenUsage> = new Schema<IAITokenUsage>(
  {
    company_object_id: SCHEMA_DEFINITION_PROPERTY.requiredObjectId,
    user_object_id: SCHEMA_DEFINITION_PROPERTY.requiredObjectId,
    feature: SCHEMA_DEFINITION_PROPERTY.requiredString,
    tokens_used: { type: Number, required: true, default: 0 },
    prompt_tokens: { type: Number, required: true, default: 0 },
    completion_tokens: { type: Number, required: true, default: 0 },
  },
  {
    ...GENERAL_SCHEMA_OPTIONS,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);
