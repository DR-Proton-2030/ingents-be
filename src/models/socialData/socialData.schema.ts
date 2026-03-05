import { Schema } from "mongoose";
import SCHEMA_DEFINITION_PROPERTY from "../../constants/model/model.constant";
import { GENERAL_SCHEMA_OPTIONS } from "../../constants/model/schemaOption";
import { ISocialData } from "../../types/interface/socialData.interface";

const socialDataSchema: Schema<ISocialData> = new Schema<ISocialData>(
  {
    user_object_id: {
      ...SCHEMA_DEFINITION_PROPERTY.requiredObjectId,
      ref: "users",
    },
    platform_name: {
      ...SCHEMA_DEFINITION_PROPERTY.requiredString,
      enum: ["youtube", "facebook", "x", "instagram", "instagram_business"],
    },
    platform_id: SCHEMA_DEFINITION_PROPERTY.requiredString,
    data: {
      type: Schema.Types.Mixed,
      required: true,
    },
    is_active: SCHEMA_DEFINITION_PROPERTY.optionalBoolean,
    last_synced_at: SCHEMA_DEFINITION_PROPERTY.optionalNullDate,
  },
  {
    ...GENERAL_SCHEMA_OPTIONS,
    discriminatorKey: "platform_name", // Use platform_name as the discriminator key
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

socialDataSchema.index({ user_object_id: 1, platform_name: 1 }, { unique: true });
socialDataSchema.index({ platform_id: 1 });

export default socialDataSchema;
