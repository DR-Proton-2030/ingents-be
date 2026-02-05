import { Schema, Types } from "mongoose";
import SCHEMA_DEFINITION_PROPERTY from "../../constants/model/model.constant";
import { GENERAL_SCHEMA_OPTIONS } from "../../constants/model/schemaOption";

export interface IScheduledPost {
  _id?: Types.ObjectId;
  user_id: Types.ObjectId;
  platform: "facebook" | "instagram" | "youtube" | "x";
  content: string;
  media_urls?: string[];
  media_type?: "image" | "video" | "text";
  hashtags?: string[];
  scheduled_at: Date;
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
  job_id?: string;
  page_id?: string;
  channel_id?: string;
  platform_specific_data?: Record<string, any>;
  error_message?: string;
  retry_count?: number;
  max_retries?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const scheduledPostSchema = new Schema<IScheduledPost>(
  {
    user_id: {
      ...SCHEMA_DEFINITION_PROPERTY.requiredObjectId,
      ref: "users",
    },
    platform: {
      type: String,
      required: true,
      enum: ["facebook", "instagram", "youtube", "x"],
    },
    content: SCHEMA_DEFINITION_PROPERTY.requiredString,
    media_urls: {
      type: [String],
      default: [],
    },
    media_type: {
      type: String,
      enum: ["image", "video", "text"],
      default: "text",
    },
    hashtags: {
      type: [String],
      default: [],
    },
    scheduled_at: SCHEMA_DEFINITION_PROPERTY.requiredDate,
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed", "cancelled"],
      default: "pending",
    },
    job_id: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
    page_id: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
    channel_id: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
    platform_specific_data: {
      type: Schema.Types.Mixed,
      default: {},
    },
    error_message: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
    retry_count: {
      type: Number,
      default: 0,
    },
    max_retries: {
      type: Number,
      default: 3,
    },
  },
  {
    ...GENERAL_SCHEMA_OPTIONS,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Index for efficient querying
scheduledPostSchema.index({ user_id: 1, status: 1 });
scheduledPostSchema.index({ scheduled_at: 1, status: 1 });
scheduledPostSchema.index({ job_id: 1 });

export default scheduledPostSchema;
