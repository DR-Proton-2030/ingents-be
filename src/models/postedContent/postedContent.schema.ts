import { Schema, Types } from "mongoose";
import SCHEMA_DEFINITION_PROPERTY from "../../constants/model/model.constant";
import { GENERAL_SCHEMA_OPTIONS } from "../../constants/model/schemaOption";

export interface IPostedContent {
  _id?: Types.ObjectId;
  user_id: Types.ObjectId;
  scheduled_post_id?: Types.ObjectId;
  platform: "facebook" | "instagram" | "youtube" | "x";
  content: string;
  media_urls?: string[];
  media_type?: "image" | "video" | "text";
  hashtags?: string[];
  posted_at: Date;
  platform_post_id?: string;
  platform_response?: Record<string, any>;
  page_id?: string;
  channel_id?: string;
  engagement?: {
    likes?: number;
    comments?: number;
    shares?: number;
    views?: number;
  };
  is_scheduled: boolean;
  status: "published" | "failed";
  error_message?: string;  last_metrics_sync?: Date;  createdAt?: Date;
  updatedAt?: Date;
}

const postedContentSchema = new Schema<IPostedContent>(
  {
    user_id: {
      ...SCHEMA_DEFINITION_PROPERTY.requiredObjectId,
      ref: "users",
    },
    scheduled_post_id: {
      type: Schema.Types.ObjectId,
      ref: "scheduled_posts",
      default: null,
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
    posted_at: SCHEMA_DEFINITION_PROPERTY.requiredDate,
    platform_post_id: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
    platform_response: {
      type: Schema.Types.Mixed,
      default: {},
    },
    page_id: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
    channel_id: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
    engagement: {
      likes: { type: Number, default: 0 },
      comments: { type: Number, default: 0 },
      shares: { type: Number, default: 0 },
      views: { type: Number, default: 0 },
    },
    is_scheduled: {
      type: Boolean,
      required: true,
      default: false,
    },
    status: {
      type: String,
      enum: ["published", "failed"],
      default: "published",
    },
    error_message: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
    last_metrics_sync: SCHEMA_DEFINITION_PROPERTY.optionalNullDate,
  },
  {
    ...GENERAL_SCHEMA_OPTIONS,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Index for efficient querying
postedContentSchema.index({ user_id: 1, platform: 1 });
postedContentSchema.index({ posted_at: -1 });
postedContentSchema.index({ scheduled_post_id: 1 });

export default postedContentSchema;
