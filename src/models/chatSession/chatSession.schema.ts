import { Schema } from "mongoose";
import { IChatSession } from "../../types/interface/chatSession.interface";
import { GENERAL_SCHEMA_OPTIONS } from "../../constants/model/schemaOption";
import SCHEMA_DEFINITION_PROPERTY from "../../constants/model/model.constant";

export const chatSessionSchema: Schema<IChatSession> = new Schema<IChatSession>(
  {
    userId: SCHEMA_DEFINITION_PROPERTY.requiredObjectId,
    title: { type: String, required: false, default: "New Chat" },
  },
  {
    ...GENERAL_SCHEMA_OPTIONS,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);
