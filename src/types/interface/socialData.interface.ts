import { SchemaDefinitionProperty, Types } from "mongoose";

export interface IYouTubeAllDeta {
  _id?: Types.ObjectId;
  channel: {
    _id?: Types.ObjectId;
    id: string;
    title: string;
    handle?: string;
    description?: string;
    thumbnails: any; // Google API thumbnail object
    statistics: any; // viewCount, subscriberCount, etc.
    branding: any;   // banner and channel settings
  };
  demographics: {
    _id?: Types.ObjectId;
    topLocations: Array<{ _id?: Types.ObjectId; country: string; views: number }>;
    ageRange: Array<{ _id?: Types.ObjectId; ageGroup: string; views: number }>;
    gender: Array<{ _id?: Types.ObjectId; gender: string; views: number }>;
  };
  postActivity: {
    _id?: Types.ObjectId;
    shorts: number;
    videos: number;
    lives: number;
    growthTrend: Array<{ _id?: Types.ObjectId; date: string; views: number; subscribersGained: number }>;
  };
  recentVideos: Array<{
    _id?: Types.ObjectId;
    id: string;
    title: string;
    publishedAt: string;
    thumbnails: any;
    statistics: any;
    duration: string;
    privacyStatus: string;
  }>;
  recentSubscribers: Array<{
    _id?: Types.ObjectId;
    channelId: string;
    title: string;
    thumbnails: any;
    subscribedAt: string;
  }>;
  recentComments: Array<{
    _id?: Types.ObjectId;
    id: string;
    videoId: string;
    text: string;
    author: string;
    authorProfileImageUrl: string;
    publishedAt: string;
    replyCount: number;
  }>;
  postSchedule: Array<{
    _id?: Types.ObjectId;
    id: string;
    title: string;
    scheduledAt: string;
    privacyStatus: string;
    thumbnails: any;
  }>;
  analytics: {
    _id?: Types.ObjectId;
    overview: {
      _id?: Types.ObjectId;
      views: number;
      watchTimeMinutes: number;
      averageViewDuration: number;
      averageViewPercentage: number;
      impressions: number;
      impressionsCtr: number;
      subscribersGained: number;
      subscribersLost: number;
      netSubscribers: number;
    };
    dailyTrend: Array<{ _id?: Types.ObjectId; date: string; views: number; subscribersGained: number }>;
    trafficSources: Array<{ _id?: Types.ObjectId; source: string; views: number; watchTimeMinutes: number; impressions: number; impressionsCtr: number }>;
    devices: Array<{ _id?: Types.ObjectId; deviceType: string; views: number; watchTimeMinutes: number }>;
    topVideos: Array<{
      _id?: Types.ObjectId;
      videoId: string;
      views: number;
      watchTimeMinutes: number;
      averageViewDuration: number;
      averageViewPercentage: number;
      title: string;
      thumbnails: any;
      duration: string;
      privacyStatus: string;
      publishedAt: string;
      statistics: any;
      url: string;
    }>;
    geography: {
      _id?: Types.ObjectId;
      countries: Array<{ _id?: Types.ObjectId; country: string; views: number; watchTimeMinutes: number; averageViewDuration: number }>;
      provincesUS: Array<{ _id?: Types.ObjectId; province: string; views: number; watchTimeMinutes: number; averageViewDuration: number }>;
      provincesCA: Array<{ _id?: Types.ObjectId; province: string; views: number; watchTimeMinutes: number; averageViewDuration: number }>;
    };
    revenue: {
      _id?: Types.ObjectId;
      overview: { _id?: Types.ObjectId; estimatedRevenue: number; adImpressions: number; monetizedPlaybacks: number; playbackBasedCpm: number };
      byDay: Array<{ _id?: Types.ObjectId; date: string; estimatedRevenue: number; adImpressions: number; monetizedPlaybacks: number; playbackBasedCpm: number }>;
    };
  };
  dashboard: {
    _id?: Types.ObjectId;
    topContent48h: Array<{ _id?: Types.ObjectId; [key: string]: any }>;
    overview28d: {
      _id?: Types.ObjectId;
      totalViews: number;
      totalWatchTimeHours: number;
      subscribersGained: number;
      subscribersLost: number;
      netSubscribers: number;
      topContent: Array<{ _id?: Types.ObjectId; [key: string]: any }>;
    };
    contentTab: { _id?: Types.ObjectId; views: number; publishedContent: Array<{ _id?: Types.ObjectId; [key: string]: any }>; viewerBreakdown: any };
    trafficSources: Array<{ _id?: Types.ObjectId; source: string; views: number; percentage: number }>;
    audience: { _id?: Types.ObjectId; views: number; watchTimeHours: number; subscribersNet: number; watchTimeSplit: { _id?: Types.ObjectId; subscribedPercent: number; notSubscribedPercent: number } };
  };
}

export interface IYouTubeData {
  _id?: Types.ObjectId;
  user_object_id: Types.ObjectId;
  platform_id: string;
  platform_name: "youtube";
  data: IYouTubeAllDeta;
  is_active: boolean;
  last_synced_at: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ISocialData {
  _id: string;
  user_object_id: Types.ObjectId;
  platform_name: "youtube" | "facebook" | "x" | "instagram" | "instagram_business";
  platform_id: string;
  data: IYouTubeAllDeta | any; // Platform specific metrics (e.g. YouTube stats)
  is_active: boolean;
  last_synced_at: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
