import mongoose, { Schema } from "mongoose";
import { GENERAL_SCHEMA_OPTIONS } from "../../constants/model/schemaOption";
import SCHEMA_DEFINITION_PROPERTY from "../../constants/model/model.constant";
import { ICampaign } from "../../types/interface/campaign.interface";

export const campaignSchema: Schema<ICampaign> = new Schema<ICampaign>(
  {
    name: SCHEMA_DEFINITION_PROPERTY.requiredString,
    type: {
      type: String,
      enum: ["social_broadcaster", "whatsapp_messenger"],
      required: true,
    },
    message_content: SCHEMA_DEFINITION_PROPERTY.requiredString,
    frequency: {
      type: String,
      enum: ["once", "recurring"],
      required: true,
    },
    recurring_days: {
      type: [String],
      default: [],
    },
    scheduled_time: {
      type: String,
    },
    status: {
      type: String,
      enum: ["active", "draft", "paused", "completed"],
      default: "active",
    },
    created_by_user_object_id: SCHEMA_DEFINITION_PROPERTY.requiredObjectId,
    company_object_id: SCHEMA_DEFINITION_PROPERTY.requiredObjectId,
  },
  {
    ...GENERAL_SCHEMA_OPTIONS,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);
