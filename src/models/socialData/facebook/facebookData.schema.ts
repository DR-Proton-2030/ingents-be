import { Schema } from "mongoose";
import SCHEMA_DEFINITION_PROPERTY from "../../../constants/model/model.constant";

const facebookPageSchema = new Schema(
  {
    id: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
    name: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
    fan_count: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
    followers_count: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
    picture: SCHEMA_DEFINITION_PROPERTY.optionalNullObject,
  },
  { _id: true }
);

const topContentItemSchema = new Schema(
  {
    id: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
    title: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
    thumbnail: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
    created_time: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
    views: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
    viewTime: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
    permalink_url: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
  },
  { _id: true }
);

const facebookContentItemSchema = new Schema(
  {
    id: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
    type: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
    title: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
    permalink_url: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
    created_time: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
    thumbnail: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
    media_urls: { type: [String], default: [] },
  },
  { _id: true }
);

const facebookOverviewSchema = new Schema(
  {
    views: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
    views3s: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
    views1m: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
    watchTime: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
    threeSecondViewsUnavailable: SCHEMA_DEFINITION_PROPERTY.optionalBoolean,
    oneMinuteViewsUnavailable: SCHEMA_DEFINITION_PROPERTY.optionalBoolean,
    followersGained: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
    followersLost: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
    netFollowers: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
    viewsOverTime: [new Schema({}, { _id: true, strict: false })],
    topContent: [topContentItemSchema],
  },
  { _id: true }
);

const facebookContentTabSchema = new Schema(
  {
    totalViews: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
    publishedContent: [facebookContentItemSchema],
    viewerTypeUnavailable: SCHEMA_DEFINITION_PROPERTY.optionalBoolean,
    viewerTypes: [new Schema({}, { _id: true, strict: false })],
  },
  { _id: true }
);

const facebookEngagementSchema = new Schema(
  {
    totals: new Schema({}, { _id: true, strict: false }),
    engagementOverTimeUnavailable: SCHEMA_DEFINITION_PROPERTY.optionalBoolean,
  },
  { _id: true }
);

const facebookAudienceSchema = new Schema(
  {
    followers: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
    totalViews: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
    watchTimeSplitUnavailable: SCHEMA_DEFINITION_PROPERTY.optionalBoolean,
    watchTimeSplit: [
      new Schema(
        {
          label: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
          value: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
        },
        { _id: true }
      ),
    ],
    demographics: new Schema(
      {
        ageGender: [new Schema({ label: String, value: Number }, { _id: true })],
        countries: [new Schema({ label: String, value: Number }, { _id: true })],
        cities: [new Schema({ label: String, value: Number }, { _id: true })],
      },
      { _id: true }
    ),
  },
  { _id: true }
);

const facebookTrafficSourcesSchema = new Schema(
  {
    sources: [new Schema({}, { _id: true, strict: false })],
    trafficSourcesUnavailable: SCHEMA_DEFINITION_PROPERTY.optionalBoolean,
  },
  { _id: true }
);

const facebookImpressionsSchema = new Schema(
  {
    impressionsUnavailable: SCHEMA_DEFINITION_PROPERTY.optionalBoolean,
    reason: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
    impressions: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
    ctr: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
    watchTimeFromImpressions: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
  },
  { _id: true }
);

export const facebookMetricsSchema = new Schema(
  {
    page: facebookPageSchema,
    overview: facebookOverviewSchema,
    content: facebookContentTabSchema,
    engagement: facebookEngagementSchema,
    audience: facebookAudienceSchema,
    trafficSources: facebookTrafficSourcesSchema,
    impressions: facebookImpressionsSchema,
  },
  { _id: true }
);
