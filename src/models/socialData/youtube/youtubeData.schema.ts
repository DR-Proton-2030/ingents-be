import { Schema } from "mongoose";
import { GENERAL_SCHEMA_OPTIONS } from "../../../constants/model/schemaOption";
import SCHEMA_DEFINITION_PROPERTY from "../../../constants/model/model.constant";



// --- Sub-Schemas for nested objects ---

const channelSchema = new Schema(
  {
    id: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
    title: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
    handle: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
    description: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
    thumbnails: SCHEMA_DEFINITION_PROPERTY.optionalNullObject,
    statistics: SCHEMA_DEFINITION_PROPERTY.optionalNullObject,
    branding: SCHEMA_DEFINITION_PROPERTY.optionalNullObject,
  },
  { _id: true }
);

const demographicsSchema = new Schema(
  {
    topLocations: [
      new Schema(
        {
          country: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
          views: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
        },
        { _id: true }
      ),
    ],
    ageRange: [
      new Schema(
        {
          ageGroup: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
          views: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
        },
        { _id: true }
      ),
    ],
    gender: [
      new Schema(
        {
          gender: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
          views: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
        },
        { _id: true }
      ),
    ],
  },
  { _id: true }
);

const postActivitySchema = new Schema(
  {
    shorts: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
    videos: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
    lives: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
    growthTrend: [
      new Schema(
        {
          date: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
          views: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
          subscribersGained: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
        },
        { _id: true }
      ),
    ],
  },
  { _id: true }
);

const recentVideoSchema = new Schema(
  {
    id: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
    title: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
    publishedAt: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
    thumbnails: SCHEMA_DEFINITION_PROPERTY.optionalNullObject,
    statistics: SCHEMA_DEFINITION_PROPERTY.optionalNullObject,
    duration: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
    privacyStatus: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
  },
  { _id: true }
);

const recentSubscriberSchema = new Schema(
  {
    channelId: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
    title: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
    thumbnails: SCHEMA_DEFINITION_PROPERTY.optionalNullObject,
    subscribedAt: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
  },
  { _id: true }
);

const recentCommentSchema = new Schema(
  {
    id: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
    videoId: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
    text: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
    author: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
    authorProfileImageUrl: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
    publishedAt: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
    replyCount: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
  },
  { _id: true }
);

const postScheduleSchema = new Schema(
  {
    id: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
    title: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
    scheduledAt: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
    privacyStatus: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
    thumbnails: SCHEMA_DEFINITION_PROPERTY.optionalNullObject,
  },
  { _id: true }
);

// --- Analytics & Revenue Sub-Schemas ---

const analyticsOverviewSchema = new Schema(
  {
    views: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
    watchTimeMinutes: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
    averageViewDuration: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
    averageViewPercentage: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
    impressions: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
    impressionsCtr: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
    subscribersGained: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
    subscribersLost: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
    netSubscribers: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
  },
  { _id: true }
);

const revenueSchema = new Schema(
  {
    overview: new Schema(
      {
        estimatedRevenue: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
        adImpressions: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
        monetizedPlaybacks: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
        playbackBasedCpm: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
      },
      { _id: true }
    ),
    byDay: [
      new Schema(
        {
          date: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
          estimatedRevenue: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
          adImpressions: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
          monetizedPlaybacks: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
          playbackBasedCpm: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
        },
        { _id: true }
      ),
    ],
  },
  { _id: true }
);

const analyticsSchema = new Schema(
  {
    overview: analyticsOverviewSchema,
    dailyTrend: [
      new Schema(
        {
          date: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
          views: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
          subscribersGained: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
        },
        { _id: true }
      ),
    ],
    trafficSources: [
      new Schema(
        {
          source: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
          views: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
          watchTimeMinutes: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
          impressions: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
          impressionsCtr: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
        },
        { _id: true }
      ),
    ],
    devices: [
      new Schema(
        {
          deviceType: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
          views: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
          watchTimeMinutes: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
        },
        { _id: true }
      ),
    ],
    topVideos: [
      new Schema(
        {
          videoId: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
          views: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
          watchTimeMinutes: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
          averageViewDuration: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
          averageViewPercentage: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
          title: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
          thumbnails: SCHEMA_DEFINITION_PROPERTY.optionalNullObject,
          duration: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
          privacyStatus: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
          publishedAt: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
          statistics: SCHEMA_DEFINITION_PROPERTY.optionalNullObject,
          url: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
        },
        { _id: true }
      ),
    ],
    geography: new Schema(
      {
        countries: [
          new Schema(
            {
              country: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
              views: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
              watchTimeMinutes: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
              averageViewDuration: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
            },
            { _id: true }
          ),
        ],
        provincesUS: [
          new Schema(
            {
              province: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
              views: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
              watchTimeMinutes: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
              averageViewDuration: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
            },
            { _id: true }
          ),
        ],
        provincesCA: [
          new Schema(
            {
              province: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
              views: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
              watchTimeMinutes: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
              averageViewDuration: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
            },
            { _id: true }
          ),
        ],
      },
      { _id: true }
    ),
    revenue: revenueSchema,
  },
  { _id: true }
);

// --- Dashboard Sub-Schemas ---

const dashboardSchema = new Schema(
  {
    topContent48h: [new Schema({}, { _id: true, strict: false })],
    overview28d: new Schema(
      {
        totalViews: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
        totalWatchTimeHours: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
        subscribersGained: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
        subscribersLost: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
        netSubscribers: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
        topContent: [new Schema({}, { _id: true, strict: false })],
      },
      { _id: true }
    ),
    contentTab: new Schema(
      {
        views: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
        publishedContent: [new Schema({}, { _id: true, strict: false })],
        viewerBreakdown: SCHEMA_DEFINITION_PROPERTY.optionalNullObject,
      },
      { _id: true }
    ),
    trafficSources: [
      new Schema(
        {
          source: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
          views: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
          percentage: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
        },
        { _id: true }
      ),
    ],
    audience: new Schema(
      {
        views: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
        watchTimeHours: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
        subscribersNet: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
        watchTimeSplit: new Schema(
          {
            subscribedPercent: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
            notSubscribedPercent: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
          },
          { _id: true }
        ),
      },
      { _id: true }
    ),
  },
  { _id: true }
);


// --- Final YouTube Metrics Schema ---

export const youtubeMetricsSchema = new Schema(
  {
    channel: channelSchema,
    demographics: demographicsSchema,
    postActivity: postActivitySchema,
    recentVideos: [recentVideoSchema],
    recentSubscribers: [recentSubscriberSchema],
    recentComments: [recentCommentSchema],
    postSchedule: [postScheduleSchema],
    analytics: analyticsSchema,
    dashboard: dashboardSchema,
  },
  { _id: true }
);

// --- Full collection Schema ---

const youtubeDataSchema: Schema = new Schema(
  {
    user_object_id: {
      ...SCHEMA_DEFINITION_PROPERTY.requiredObjectId,
      ref: "users",
    },
    platform_name: {
      ...SCHEMA_DEFINITION_PROPERTY.requiredString,
      default: "youtube",
    },
    platform_id: SCHEMA_DEFINITION_PROPERTY.requiredString,
    data: youtubeMetricsSchema,
    is_active: SCHEMA_DEFINITION_PROPERTY.optionalBoolean,
    last_synced_at: SCHEMA_DEFINITION_PROPERTY.optionalNullDate,
  },
  {
    ...GENERAL_SCHEMA_OPTIONS,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

youtubeDataSchema.index({ user_object_id: 1, platform_name: 1 }, { unique: true });
youtubeDataSchema.index({ platform_id: 1 });

export default youtubeDataSchema;
