import { Schema, Types } from "mongoose";
import SCHEMA_DEFINITION_PROPERTY from "../../constants/model/model.constant";
import { GENERAL_SCHEMA_OPTIONS } from "../../constants/model/schemaOption";

export interface IContentMetricsSnapshot {
  _id?: Types.ObjectId;
  user_id: Types.ObjectId;
  posted_content_id: Types.ObjectId;
  platform: "facebook" | "instagram" | "youtube" | "x";
  platform_post_id: string;
  snapshot_at: Date;
  metrics: {
    views?: number;
    likes?: number;
    comments?: number;
    shares?: number;
    impressions?: number;
    reach?: number;
    watch_time_minutes?: number;
    avg_view_duration?: number;
    saves?: number;
    retweets?: number;
    quotes?: number;
    bookmarks?: number;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

const contentMetricsSnapshotSchema = new Schema<IContentMetricsSnapshot>(
  {
    user_id: {
      ...SCHEMA_DEFINITION_PROPERTY.requiredObjectId,
      ref: "users",
    },
    posted_content_id: {
      ...SCHEMA_DEFINITION_PROPERTY.requiredObjectId,
      ref: "posted_contents",
    },
    platform: {
      type: String,
      required: true,
      enum: ["facebook", "instagram", "youtube", "x"],
    },
    platform_post_id: SCHEMA_DEFINITION_PROPERTY.requiredString,
    snapshot_at: {
      type: Date,
      required: true,
      default: Date.now,
    },
    metrics: {
      views: { type: Number, default: 0 },
      likes: { type: Number, default: 0 },
      comments: { type: Number, default: 0 },
      shares: { type: Number, default: 0 },
      impressions: { type: Number, default: 0 },
      reach: { type: Number, default: 0 },
      watch_time_minutes: { type: Number, default: 0 },
      avg_view_duration: { type: Number, default: 0 },
      saves: { type: Number, default: 0 },
      retweets: { type: Number, default: 0 },
      quotes: { type: Number, default: 0 },
      bookmarks: { type: Number, default: 0 },
    },
  },
  {
    ...GENERAL_SCHEMA_OPTIONS,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

contentMetricsSnapshotSchema.index({ posted_content_id: 1, snapshot_at: -1 });
contentMetricsSnapshotSchema.index({ user_id: 1, platform: 1, snapshot_at: -1 });

export default contentMetricsSnapshotSchema;
