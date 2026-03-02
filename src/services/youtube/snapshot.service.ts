import { getAuthorizedClient } from "./youtube.service";
import { fetchChannelInfo } from "./data/channel";
import {
  getCustomWindow,
  getTodayStr,
  getLast48hStartStr,
  getLast28dStartStr,
} from "./utils/dates";
import { paginateUploads } from "./data/uploads";
import { fetchVideoStatsMap, fetchMetaForVideos } from "./data/videos";
import { isoToSeconds } from "./utils/iso";
import {
  getTopCountries,
  getProvincesUS,
  getProvincesCAEmpty,
} from "./analytics/geography";
import { getGrowth, getOverview } from "./analytics/overview";
import {
  getAgeReport,
  getGenderReport,
  getDeviceTypes,
  getSubscribedStatus,
} from "./analytics/audience";
import { getTrafficSources } from "./analytics/traffic";
import { getTopContent, getTopVideosWithRetention } from "./analytics/content";
import UserModel from "../../models/users/users.model";
import SocialDataModel from "../../models/socialData/socialData.model";
import PostedContentModel from "../../models/postedContent/postedContent.model";
import { IYouTubeAllDeta } from "../../types/interface/socialData.interface";

export const fetchAndStoreYoutubeData = async (userId: string) => {
  try {
    const user = await UserModel.findById(userId);
    if (!user || !user.youtube?.access_token) {
      throw new Error("User or YouTube token not found");
    }

    
    const { youtube, analytics } = await getAuthorizedClient(
      userId,
      user.youtube.access_token,
      user.youtube.refresh_token,
    );

    // 1. Channel info
    const { channelData, channelId, uploadsPlaylistId } =
      await fetchChannelInfo(youtube);

    // Ensure we have name and project_id in User model
    if (!user.youtube.name || !user.youtube.project_id) {
      console.log(`[YouTubeSync] Syncing channel details for ${userId}`);
      await UserModel.findByIdAndUpdate(userId, {
        $set: {
          "youtube.name": channelData.snippet?.title || "",
          "youtube.project_id": channelId,
        },
      });
    }

    // 2. Dates for Analytics
    const daysParam = 30;
    const { start: startDate, end: endDate } = getCustomWindow(daysParam);
    const todayStr = getTodayStr();
    const last48hStartStr = getLast48hStartStr();
    const last28dStartStr = getLast28dStartStr();

    // 3. Parallel fetching
    const [
      videosResp,
      subscriptionsResp,
      activitiesResp,
      playlistsResp,
      commentsResp,
    ] = await Promise.all([
      uploadsPlaylistId
        ? youtube.playlistItems.list({
            part: ["snippet", "contentDetails"],
            playlistId: uploadsPlaylistId,
            maxResults: 15,
          })
        : Promise.resolve({ data: { items: [] } }),
      youtube.subscriptions.list({
        part: ["snippet", "subscriberSnippet"],
        myRecentSubscribers: true,
        maxResults: 10,
      }),
      youtube.activities.list({
        part: ["snippet", "contentDetails"],
        mine: true,
        maxResults: 10,
      }),
      youtube.playlists.list({
        part: ["snippet", "contentDetails", "status"],
        mine: true,
        maxResults: 10,
      }),
      youtube.commentThreads.list({
        part: ["snippet", "replies"],
        allThreadsRelatedToChannelId: channelId,
        maxResults: 10,
      }),
    ]);

    const [
      analyticsReport,
      growthReport,
      ageReport,
      genderReport,
      overviewReport,
      trafficSourceReport,
      deviceTypeReport,
      topVideosReport,
      provincesUSReport,
      provincesCAReport,
    ] = await Promise.all([
      getTopCountries(analytics, channelId, startDate, endDate, 5),
      getGrowth(analytics, channelId, startDate, endDate),
      getAgeReport(analytics, channelId, startDate, endDate),
      getGenderReport(analytics, channelId, startDate, endDate),
      getOverview(analytics, channelId, startDate, endDate),
      getTrafficSources(analytics, channelId, startDate, endDate),
      getDeviceTypes(analytics, channelId, startDate, endDate),
      getTopVideosWithRetention(analytics, channelId, startDate, endDate, 10),
      getProvincesUS(analytics, channelId, startDate, endDate, 10),
      getProvincesCAEmpty(),
    ]);

    // Dashboard specific reports
    const [
      topContent48hReport,
      overview28dReport,
      topContent28dReport,
      subscribedStatus28dReport,
      trafficSources28dReport,
    ] = await Promise.all([
      getTopContent(analytics, channelId, last48hStartStr, todayStr, 10),
      getOverview(analytics, channelId, last28dStartStr, todayStr),
      getTopContent(analytics, channelId, last28dStartStr, todayStr, 10),
      getSubscribedStatus(analytics, channelId, last28dStartStr, todayStr),
      getTrafficSources(analytics, channelId, last28dStartStr, todayStr),
    ]);

    const allUploadItems: any[] = await paginateUploads(
      youtube,
      uploadsPlaylistId || null,
      videosResp,
    );

    const videoIds = (allUploadItems || [])
      .map((v) => v.contentDetails?.videoId)
      .filter((id): id is string => !!id);
    const videoStatsMap = await fetchVideoStatsMap(youtube, videoIds);

    // Update engagement for posted content
    await Promise.all(
      Object.entries(videoStatsMap).map(async ([vId, data]) => {
        const stats = data.statistics;
        if (stats) {
          await PostedContentModel.findOneAndUpdate(
            { platform_post_id: vId, platform: "youtube", user_id: userId },
            {
              $set: {
                engagement: {
                  views: Number(stats.viewCount || 0),
                  likes: Number(stats.likeCount || 0),
                  comments: Number(stats.commentCount || 0),
                },
              },
            },
          );
        }
      }),
    );

    const topVideoIds: string[] = ((topVideosReport?.data as any)?.rows || [])
      .map((row: any[]) => row?.[0])
      .filter((id: any): id is string => typeof id === "string" && !!id);

    const topVideoStatsMap = await fetchMetaForVideos(youtube, topVideoIds);

    let shortsCount = 0;
    let videosCount = 0;
    let liveCount = 0;

    (activitiesResp.data.items || []).forEach((act: any) => {
      if (act.snippet?.type === "liveStream") liveCount++;
    });

    Object.values(videoStatsMap).forEach((v: any) => {
      const sec = isoToSeconds(v?.contentDetails?.duration);
      if (sec > 0) {
        if (sec < 60) shortsCount++;
        else videosCount++;
      }
    });

    const postSchedule = Object.values(videoStatsMap)
      .filter((v: any) => {
        const publishAt = v.status?.publishAt;
        return publishAt && new Date(publishAt).getTime() > Date.now();
      })
      .map((v: any) => ({
        id: v.id,
        title: (v.snippet?.title as string) || "",
        scheduledAt: v.status?.publishAt,
        privacyStatus: v.status?.privacyStatus,
        thumbnails: v.snippet?.thumbnails,
      }))
      .sort(
        (a: any, b: any) =>
          new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
      );

    const resultData: IYouTubeAllDeta = {
      channel: {
        id: channelId,
        title: (channelData.snippet?.title as string) || "",
        handle: (channelData.snippet?.customUrl as string) || "",
        description: (channelData.snippet?.description as string) || "",
        thumbnails: channelData.snippet?.thumbnails,
        statistics: channelData.statistics,
        branding: channelData.brandingSettings,
      },
      demographics: {
        topLocations:
          (analyticsReport?.data as any)?.rows?.map((row: any[]) => ({
            country: row[0],
            views: row[1],
          })) || [],
        ageRange:
          (ageReport?.data as any)?.rows?.map((row: any[]) => ({
            ageGroup: row[0],
            views: row[1],
          })) || [],
        gender:
          (genderReport?.data as any)?.rows?.map((row: any[]) => ({
            gender: row[0],
            views: row[1],
          })) || [],
      },
      postActivity: {
        shorts: shortsCount,
        videos: videosCount,
        lives: liveCount,
        growthTrend:
          (growthReport?.data as any)?.rows?.map((row: any[]) => ({
            date: row[0],
            views: row[1],
            subscribersGained: row[2],
          })) || [],
      },
      recentVideos: (allUploadItems || []).map((item: any) => {
        const vId = item.contentDetails?.videoId as string;
        const stats = (videoStatsMap as any)[vId] || {};
        return {
          id: vId || "",
          title: (item.snippet?.title as string) || "",
          publishedAt:
            (item.contentDetails?.videoPublishedAt as string) ||
            (item.snippet?.publishedAt as string) ||
            "",
          thumbnails: item.snippet?.thumbnails,
          statistics: stats.statistics,
          duration: (stats.contentDetails?.duration as string) || "",
          privacyStatus: (stats.status?.privacyStatus as string) || "public",
        };
      }),
      recentSubscribers: (subscriptionsResp.data.items || []).map(
        (item: any) => ({
          channelId: item.subscriberSnippet?.channelId,
          title: item.subscriberSnippet?.title,
          thumbnails: item.subscriberSnippet?.thumbnails,
          subscribedAt: item.snippet?.publishedAt,
        }),
      ),
      recentComments: (commentsResp.data.items || []).map((thread: any) => ({
        id: thread.id,
        videoId: thread.snippet?.videoId,
        text: thread.snippet?.topLevelComment?.snippet?.textDisplay,
        author: thread.snippet?.topLevelComment?.snippet?.authorDisplayName,
        authorProfileImageUrl:
          thread.snippet?.topLevelComment?.snippet?.authorProfileImageUrl,
        publishedAt: thread.snippet?.topLevelComment?.snippet?.publishedAt,
        replyCount: thread.snippet?.totalReplyCount,
      })),
      postSchedule,
      analytics: {
        overview: (() => {
          const rows = (overviewReport?.data as any)?.rows || [];
          const totals = rows[0] || [];
          const [
            views,
            minutes,
            avgViewDuration,
            avgViewPercentage,
            subsGained,
            subsLost,
          ] = totals;
          return {
            views: Number(views || 0),
            watchTimeMinutes: Number(minutes || 0),
            averageViewDuration: Number(avgViewDuration || 0),
            averageViewPercentage: Number(avgViewPercentage || 0),
            impressions: 0,
            impressionsCtr: 0,
            subscribersGained: Number(subsGained || 0),
            subscribersLost: Number(subsLost || 0),
            netSubscribers: Number((subsGained || 0) - (subsLost || 0)),
          };
        })(),
        dailyTrend:
          (growthReport?.data as any)?.rows?.map((row: any[]) => ({
            date: row[0],
            views: Number(row[1] || 0),
            subscribersGained: Number(row[2] || 0),
          })) || [],
        trafficSources:
          (trafficSourceReport?.data as any)?.rows?.map((row: any[]) => ({
            source: row[0],
            views: Number(row[1] || 0),
            watchTimeMinutes: Number(row[2] || 0),
            impressions: 0,
            impressionsCtr: 0,
          })) || [],
        devices:
          (deviceTypeReport?.data as any)?.rows?.map((row: any[]) => ({
            deviceType: row[0],
            views: Number(row[1] || 0),
            watchTimeMinutes: Number(row[2] || 0),
          })) || [],
        topVideos:
          (topVideosReport?.data as any)?.rows?.map((row: any[]) => {
            const videoId = row[0];
            const meta = topVideoStatsMap[videoId] || {};
            return {
              videoId,
              views: Number(row[1] || 0),
              watchTimeMinutes: Number(row[2] || 0),
              averageViewDuration: Number(row[3] || 0),
              averageViewPercentage: Number(row[4] || 0),
              title: meta.snippet?.title,
              thumbnails: meta.snippet?.thumbnails,
              duration: meta.contentDetails?.duration,
              privacyStatus: meta.status?.privacyStatus,
              publishedAt: meta.snippet?.publishedAt,
              statistics: meta.statistics,
              url: videoId
                ? `https://www.youtube.com/watch?v=${videoId}`
                : undefined,
            };
          }) || [],
        geography: {
          countries:
            (analyticsReport?.data as any)?.rows?.map((row: any[]) => ({
              country: row[0],
              views: Number(row[1] || 0),
              watchTimeMinutes: Number(row[2] || 0),
              averageViewDuration: Number(row[3] || 0),
            })) || [],
          provincesUS:
            (provincesUSReport?.data as any)?.rows?.map((row: any[]) => ({
              province: row[0],
              views: Number(row[1] || 0),
              watchTimeMinutes: Number(row[2] || 0),
              averageViewDuration: Number(row[3] || 0),
            })) || [],
          provincesCA:
            (provincesCAReport?.data as any)?.rows?.map((row: any[]) => ({
              province: row[0],
              views: Number(row[1] || 0),
              watchTimeMinutes: Number(row[2] || 0),
              averageViewDuration: Number(row[3] || 0),
            })) || [],
        },
        revenue: {
          overview: {
            estimatedRevenue: 0,
            adImpressions: 0,
            monetizedPlaybacks: 0,
            playbackBasedCpm: 0,
          },
          byDay: [],
        },
      },
      dashboard: {
        topContent48h: (topContent48hReport?.data as any)?.rows || [],
        overview28d: (() => {
          const rows = (overview28dReport?.data as any)?.rows || [];
          const totals = rows[0] || [];
          const [views, minutes, , , subsGained, subsLost] = totals;
          return {
            totalViews: Number(views || 0),
            totalWatchTimeHours: Number((Number(minutes || 0) / 60).toFixed(2)),
            subscribersGained: Number(subsGained || 0),
            subscribersLost: Number(subsLost || 0),
            netSubscribers: Number((subsGained || 0) - (subsLost || 0)),
            topContent: (topContent28dReport?.data as any)?.rows || [],
          };
        })(),
        contentTab: {
          views: Number((overview28dReport?.data as any)?.rows?.[0]?.[0] || 0),
          publishedContent: [],
          viewerBreakdown: {},
        },
        trafficSources: (() => {
          const rows = (trafficSources28dReport?.data as any)?.rows || [];
          const totalViews = rows.reduce(
            (acc: number, row: any[]) => acc + Number(row[1] || 0),
            0,
          );
          return rows.map((row: any[]) => ({
            source: row[0],
            views: Number(row[1] || 0),
            percentage:
              totalViews > 0
                ? Number(((Number(row[1] || 0) / totalViews) * 100).toFixed(2))
                : 0,
          }));
        })(),
        audience: (() => {
          const rows = (overview28dReport?.data as any)?.rows || [];
          const totals = rows[0] || [];
          const [views, minutes, , , subsGained, subsLost] = totals;
          const subRows = (subscribedStatus28dReport?.data as any)?.rows || [];
          let subPercent = 0;
          const totalViews = Number(views || 0);
          if (totalViews > 0) {
            const subViews = subRows.reduce((acc: number, r: any[]) => {
              if (r[0] === "subscribed") return acc + Number(r[1] || 0);
              return acc;
            }, 0);
            subPercent = (subViews / totalViews) * 100;
          }
          return {
            views: totalViews,
            watchTimeHours: Number((Number(minutes || 0) / 60).toFixed(2)),
            subscribersNet: Number((subsGained || 0) - (subsLost || 0)),
            watchTimeSplit: {
              subscribedPercent: Number(subPercent.toFixed(2)),
              notSubscribedPercent: Number((100 - subPercent).toFixed(2)),
            },
          };
        })(),
      },
    };

    // Update snapshot in SocialDataModel
    await SocialDataModel.findOneAndUpdate(
      { user_object_id: userId, platform_name: "youtube" },
      {
        $set: {
          platform_id: channelId,
          data: resultData,
          is_active: true,
          last_synced_at: new Date(),
          updatedAt: new Date(),
        },
      },
      { upsert: true },
    );

    return resultData;
  } catch (error: any) {
    console.error("Error in fetchAndStoreYoutubeData:", error);
    throw error;
  }
};

export const getSnapshot = async (userId: string, platform: string = "youtube") => {
  return await SocialDataModel.findOne({ user_object_id: userId, platform_name: platform });
};

/**
 * Daily cron to update snapshots for all connected YouTube users.
 */
// export const dailyYouTubeSnapshotCron = async () => {
//   console.log("[SnapshotService] Starting daily YouTube snapshot cron...");
//   const users = await UserModel.find({ "youtube.access_token": { $ne: null } })
//     .select({ _id: 1 })
//     .lean();

//   for (const u of users as any[]) {
//     try {
//       console.log(`[SnapshotService] Syncing snapshot for user: ${u._id}`);
//       await fetchAndStoreYoutubeData(u._id.toString());
//     } catch (err: any) {
//       console.error(
//         `[SnapshotService] Failed to sync snapshot for user ${u._id}:`,
//         err.message,
//       );
//     }
//   }
//   console.log("[SnapshotService] Daily YouTube snapshot cron completed.");
// };

