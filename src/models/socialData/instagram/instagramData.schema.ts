import { Schema } from "mongoose";
import SCHEMA_DEFINITION_PROPERTY from "../../../constants/model/model.constant";

const instagramOverviewSchema = new Schema(
  {
    id: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
    username: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
    name: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
    account_type: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
    profile_picture_url: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
    followersCount: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
    followsCount: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
    mediaCount: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
    profileViews: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
    impressions: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
    reach: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
    views: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
  },
  { _id: true }
);

const instagramContentItemSchema = new Schema(
  {
    id: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
    media_type: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
    media_product_type: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
    media_url: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
    media_urls: { type: [String], default: [] },
    permalink: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
    timestamp: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
    caption: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
    like_count: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
    comments_count: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
    insights: { type: [Schema.Types.Mixed], default: [] },
  },
  { _id: true }
);

const instagramContentSchema = new Schema(
  {
    publishedContent: [instagramContentItemSchema],
  },
  { _id: true }
);

const instagramAudienceSchema = new Schema(
  {
    followers: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
    demographics: new Schema({}, { _id: true, strict: false }), // flexible for age/gender breakdowns if needed
  },
  { _id: true }
);

const instagramInsightsSchema = new Schema(
  {
    views: {
      total: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
      followersPercentage: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
      nonFollowersPercentage: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
    },
    accountsReached: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
    reachByContentType: {
      posts: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
      stories: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
      reels: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
    },
    interactions: {
      total: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
      followersPercentage: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
      nonFollowersPercentage: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
    },
    interactionsByContentType: {
      posts: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
      reels: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
      stories: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
    },
    profileActivity: {
      profileVisits: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
      externalLinkTaps: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
    },
    responsiveness: {
      dailyResponseRate: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
      dailyResponseTime: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
    },
    conversations: {
      messagingConversationsStarted: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
      totalMessagingContacts: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
      newMessagingContacts: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
      returningMessagingContacts: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
    },
    topContentByViews: [instagramContentItemSchema],
    topContentByInteractions: [instagramContentItemSchema],
    daily: { type: [Schema.Types.Mixed], default: [] },
  },
  { _id: true }
);

export const instagramMetricsSchema = new Schema(
  {
    overview: instagramOverviewSchema,
    content: instagramContentSchema,
    audience: instagramAudienceSchema,
    insights: instagramInsightsSchema,
    summary: { type: Schema.Types.Mixed, default: {} },
    insights_history: {
      type: [new Schema({
        date: { type: Date, required: true },
        impressions: Number,
        reach: Number,
        profile_views: Number,
        follower_count: Number,
      }, { _id: false })],
      default: []
    }
  },
  { _id: true }
);
