import { Schema, Types } from "mongoose";
import SCHEMA_DEFINITION_PROPERTY from "../../constants/model/model.constant";
import { GENERAL_SCHEMA_OPTIONS } from "../../constants/model/schemaOption";

export interface IPlatformInsightsSnapshot {
  _id?: Types.ObjectId;
  user_id: Types.ObjectId;
  platform: "facebook" | "instagram" | "youtube" | "x";
  snapshot_at: Date;
  account_metrics: {
    followers: number;
    total_views?: number;
    total_posts?: number;
    profile_views?: number;
  };
  period_metrics: {
    new_followers?: number;
    lost_followers?: number;
    impressions?: number;
    reach?: number;
    engagement_rate?: number;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

const platformInsightsSnapshotSchema = new Schema<IPlatformInsightsSnapshot>(
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
    snapshot_at: {
      type: Date,
      required: true,
      default: Date.now,
    },
    account_metrics: {
      followers: { type: Number, default: 0 },
      total_views: { type: Number, default: 0 },
      total_posts: { type: Number, default: 0 },
      profile_views: { type: Number, default: 0 },
    },
    period_metrics: {
      new_followers: { type: Number, default: 0 },
      lost_followers: { type: Number, default: 0 },
      impressions: { type: Number, default: 0 },
      reach: { type: Number, default: 0 },
      engagement_rate: { type: Number, default: 0 },
    },
  },
  {
    ...GENERAL_SCHEMA_OPTIONS,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

platformInsightsSnapshotSchema.index({ user_id: 1, platform: 1, snapshot_at: -1 });

export default platformInsightsSnapshotSchema;
