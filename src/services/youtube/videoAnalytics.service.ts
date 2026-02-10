import type { youtubeAnalytics_v2, youtube_v3 } from "googleapis";
import { isoToSeconds } from "./utils/iso";

const pad2 = (n: number) => String(Math.max(0, Math.trunc(n))).padStart(2, "0");

const toYMD = (d: Date) => {
  const yyyy = d.getUTCFullYear();
  const mm = pad2(d.getUTCMonth() + 1);
  const dd = pad2(d.getUTCDate());
  return `${yyyy}-${mm}-${dd}`;
};

const yesterdayYMD = () => toYMD(new Date(Date.now() - 24 * 60 * 60 * 1000));

const clampEndDate = (startYMD: string, endYMD: string) =>
  endYMD < startYMD ? startYMD : endYMD;

const secondsToHMS = (secondsRaw: unknown): string => {
  const seconds = Number(secondsRaw || 0);
  if (!Number.isFinite(seconds) || seconds <= 0) return "00:00:00";
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
};

type Limitation = {
  section: string;
  reason: string;
  details?: string;
};

const safeQuery = async (
  analytics: youtubeAnalytics_v2.Youtubeanalytics,
  label: string,
  params: youtubeAnalytics_v2.Params$Resource$Reports$Query,
  limitations: Limitation[],
) => {
  try {
    return await analytics.reports.query(params);
  } catch (e: any) {
    limitations.push({
      section: label,
      reason: "YouTube Analytics API query failed",
      details: e?.errors?.[0]?.message || e?.message || String(e),
    });
    return null;
  }
};

const firstRow = (resp: any): any[] => {
  const rows = resp?.data?.rows;
  return Array.isArray(rows) && rows.length > 0 && Array.isArray(rows[0])
    ? rows[0]
    : [];
};

const rows = (resp: any): any[][] => {
  const r = resp?.data?.rows;
  return Array.isArray(r) ? (r as any[][]) : [];
};

export type SingleVideoAnalyticsResult = {
  video: {
    id: string;
    title: string | null;
    description: string | null;
    publishedAt: string | null;
    duration: string | null;
    thumbnails: youtube_v3.Schema$ThumbnailDetails | null;
    channelId: string | null;
    channelTitle: string | null;
    privacyStatus: string | null;
    statistics: {
      viewCount: number;
      likeCount: number;
      commentCount: number;
      favoriteCount: number;
    };
  };
  overview: {
    views: number;
    watchTimeHours: number;
    averageViewDuration: string;
    likes: number;
    comments: number;
    engagedViews: number | null;
  };
  reach: {
    impressions: number | null;
    impressionsCtr: number | null;
    trafficSources: Array<{
      source: string;
      views: number;
      watchTimeHours: number;
    }>;
    searchTerms: Array<{ term: string; views: number; watchTimeHours: number }>;
    externalSites: Array<{
      site: string;
      views: number;
      watchTimeHours: number;
    }>;
  };
  engagement: {
    averageViewPercentage: number | null;
    shares: number | null;
    subscribersGained: number | null;
    subscribersLost: number | null;
    playlistAdds: number | null;
    playlistRemoves: number | null;
  };
  audience: {
    subscribedStatus: Array<{
      status: string;
      views: number;
      watchTimeHours: number;
    }>;
    gender: Array<{ gender: string; viewerPercentage: number }>;
    ageGroups: Array<{ ageGroup: string; viewerPercentage: number }>;
    countries: Array<{
      country: string;
      views: number;
      watchTimeHours: number;
    }>;
    devices: Array<{
      deviceType: string;
      views: number;
      watchTimeHours: number;
    }>;
    operatingSystems: Array<{
      os: string;
      views: number;
      watchTimeHours: number;
    }>;
  };
  retention: {
    averageViewDuration: string;
    averageViewPercentage: number | null;
    curve: Array<{
      elapsedVideoTimeRatio: number;
      audienceWatchRatio: number | null;
      relativeRetentionPerformance: number | null;
    }>;
  };
  realtime: {
    window: "48h";
    viewsByHour: Array<{ hour: string; views: number }>;
  };
  limitations: Limitation[];
};

export const fetchSingleVideoAnalytics = async (opts: {
  youtube: youtube_v3.Youtube;
  analytics: youtubeAnalytics_v2.Youtubeanalytics;
  videoId: string;
}): Promise<SingleVideoAnalyticsResult> => {
  const { youtube, analytics, videoId } = opts;
  const limitations: Limitation[] = [];

  const videoResp = await youtube.videos.list({
    part: ["snippet", "statistics", "contentDetails", "status"],
    id: [videoId],
  });

  const item = (videoResp.data.items || [])[0];
  if (!item || !item.id) {
    const err: any = new Error("Video not found");
    err.statusCode = 404;
    throw err;
  }

  const publishedAt = item.snippet?.publishedAt || null;
  const startDate = publishedAt ? toYMD(new Date(publishedAt)) : "2008-01-01";
  const endDate = clampEndDate(startDate, yesterdayYMD());

  const durationSec = isoToSeconds(item.contentDetails?.duration || undefined);
  const likelyShort = durationSec > 0 && durationSec <= 60;

  const dataStats = item.statistics || {};
  const dataViews = Number(dataStats.viewCount || 0);
  const dataLikes = Number(dataStats.likeCount || 0);
  const dataComments = Number(dataStats.commentCount || 0);
  const dataFav = Number((dataStats as any).favoriteCount || 0);

  // OVERVIEW
  // First attempt includes engagedViews (may not be enabled for all accounts).
  let overviewResp = await safeQuery(
    analytics,
    "overview",
    {
      ids: "channel==MINE",
      startDate,
      endDate,
      filters: `video==${videoId}`,
      metrics:
        "views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,engagedViews",
    },
    limitations,
  );

  if (!overviewResp) {
    overviewResp = await safeQuery(
      analytics,
      "overview",
      {
        ids: "channel==MINE",
        startDate,
        endDate,
        filters: `video==${videoId}`,
        metrics:
          "views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage",
      },
      limitations,
    );
  }

  const ov = firstRow(overviewResp);
  const ovViews = Number(ov[0] || 0);
  const ovMinutes = Number(ov[1] || 0);
  const ovAvgDurSec = Number(ov[2] || 0);
  const ovAvgPct = ov.length >= 4 ? Number(ov[3] || 0) : 0;
  const ovEngagedViews = ov.length >= 5 ? Number(ov[4] || 0) : null;

  // REACH
  // Impressions-style metrics can be unavailable depending on content type (e.g., Shorts)
  // and channel eligibility. We attempt the query; if unsupported, we keep null.
  let impressions: number | null = null;
  let impressionsCtr: number | null = null;
  try {
    // Avoid hinting (hardcoding) availability by content type; let API response decide.
    // `likelyShort` is currently unused but may be useful for future feature flags.
    void likelyShort;

    const reachOverviewResp = await analytics.reports.query({
      ids: "channel==MINE",
      startDate,
      endDate,
      filters: `video==${videoId}`,
      metrics: "impressions,impressionsCtr",
    });
    const reachRow = firstRow(reachOverviewResp);
    impressions = reachRow.length >= 1 ? Number(reachRow[0] || 0) : null;
    impressionsCtr = reachRow.length >= 2 ? Number(reachRow[1] || 0) : null;
  } catch (e: any) {
    limitations.push({
      section: "reach.overview",
      reason: "YouTube Analytics API query failed",
      details: e?.errors?.[0]?.message || e?.message || String(e),
    });
  }

  // Traffic source types
  const trafficSourcesResp = await safeQuery(
    analytics,
    "reach.trafficSources",
    {
      ids: "channel==MINE",
      startDate,
      endDate,
      filters: `video==${videoId}`,
      metrics: "views,estimatedMinutesWatched",
      // Use insight dimension (matches existing working channel-level helper).
      dimensions: "insightTrafficSourceType",
      sort: "-views",
      maxResults: 25,
    },
    limitations,
  );

  // Search terms + external sites are "insight" dimensions; YouTube may withhold them
  // for low-volume videos or due to privacy thresholds. We'll try a combined query
  // (type + detail) and split results; fall back to the older per-type queries.
  const insightDetailsResp = await safeQuery(
    analytics,
    "reach.insightDetails",
    {
      ids: "channel==MINE",
      startDate,
      endDate,
      filters: `video==${videoId}`,
      metrics: "views,estimatedMinutesWatched",
      dimensions: "insightTrafficSourceType,insightTrafficSourceDetail",
      sort: "-views",
      maxResults: 50,
    },
    limitations,
  );

  const insightDetailsRows = rows(insightDetailsResp);
  const hasInsightDetails = insightDetailsRows.length > 0;

  const searchTermsResp = hasInsightDetails
    ? null
    : await safeQuery(
        analytics,
        "reach.searchTerms",
        {
          ids: "channel==MINE",
          startDate,
          endDate,
          filters: `video==${videoId};insightTrafficSourceType==YT_SEARCH`,
          metrics: "views,estimatedMinutesWatched",
          dimensions: "insightTrafficSourceDetail",
          sort: "-views",
          maxResults: 15,
        },
        limitations,
      );

  const externalSitesResp = hasInsightDetails
    ? null
    : await safeQuery(
        analytics,
        "reach.externalSites",
        {
          ids: "channel==MINE",
          startDate,
          endDate,
          filters: `video==${videoId};insightTrafficSourceType==EXT_URL`,
          metrics: "views,estimatedMinutesWatched",
          dimensions: "insightTrafficSourceDetail",
          sort: "-views",
          maxResults: 15,
        },
        limitations,
      );

  // ENGAGEMENT
  const engagementResp = await safeQuery(
    analytics,
    "engagement",
    {
      ids: "channel==MINE",
      startDate,
      endDate,
      filters: `video==${videoId}`,
      metrics:
        "averageViewPercentage,shares,subscribersGained,subscribersLost,videosAddedToPlaylists,videosRemovedFromPlaylists",
    },
    limitations,
  );
  const en = firstRow(engagementResp);

  // AUDIENCE
  const subscribedStatusResp = await safeQuery(
    analytics,
    "audience.subscribedStatus",
    {
      ids: "channel==MINE",
      startDate,
      endDate,
      filters: `video==${videoId}`,
      metrics: "views,estimatedMinutesWatched",
      dimensions: "subscribedStatus",
      sort: "-views",
    },
    limitations,
  );

  const genderResp = await safeQuery(
    analytics,
    "audience.gender",
    {
      ids: "channel==MINE",
      startDate,
      endDate,
      filters: `video==${videoId}`,
      metrics: "viewerPercentage",
      dimensions: "gender",
      sort: "gender",
    },
    limitations,
  );

  const ageResp = await safeQuery(
    analytics,
    "audience.ageGroups",
    {
      ids: "channel==MINE",
      startDate,
      endDate,
      filters: `video==${videoId}`,
      metrics: "viewerPercentage",
      dimensions: "ageGroup",
      sort: "ageGroup",
    },
    limitations,
  );

  const countriesResp = await safeQuery(
    analytics,
    "audience.countries",
    {
      ids: "channel==MINE",
      startDate,
      endDate,
      filters: `video==${videoId}`,
      metrics: "views,estimatedMinutesWatched",
      dimensions: "country",
      sort: "-views",
      maxResults: 25,
    },
    limitations,
  );

  const devicesResp = await safeQuery(
    analytics,
    "audience.devices",
    {
      ids: "channel==MINE",
      startDate,
      endDate,
      filters: `video==${videoId}`,
      metrics: "views,estimatedMinutesWatched",
      dimensions: "deviceType",
      sort: "-views",
    },
    limitations,
  );

  const osResp = await safeQuery(
    analytics,
    "audience.operatingSystems",
    {
      ids: "channel==MINE",
      startDate,
      endDate,
      filters: `video==${videoId}`,
      metrics: "views,estimatedMinutesWatched",
      dimensions: "operatingSystem",
      sort: "-views",
    },
    limitations,
  );

  // RETENTION
  const retentionCurveResp = await safeQuery(
    analytics,
    "retention.curve",
    {
      ids: "channel==MINE",
      startDate,
      endDate,
      filters: `video==${videoId}`,
      metrics: "audienceWatchRatio,relativeRetentionPerformance",
      dimensions: "elapsedVideoTimeRatio",
      sort: "elapsedVideoTimeRatio",
    },
    limitations,
  );

  // REALTIME (API-limited)
  // Keep empty by default; we don't add a static limitation entry.

  const trafficSources = rows(trafficSourcesResp).map((r) => ({
    source: String(r[0] || ""),
    views: Number(r[1] || 0),
    watchTimeHours: Number(r[2] || 0) / 60,
  }));

  const searchTerms = rows(searchTermsResp).map((r) => ({
    term: String(r[0] || ""),
    views: Number(r[1] || 0),
    watchTimeHours: Number(r[2] || 0) / 60,
  }));

  const externalSites = rows(externalSitesResp).map((r) => ({
    site: String(r[0] || ""),
    views: Number(r[1] || 0),
    watchTimeHours: Number(r[2] || 0) / 60,
  }));

  if (hasInsightDetails) {
    const searchMap = new Map<
      string,
      { term: string; views: number; minutes: number }
    >();
    const extMap = new Map<
      string,
      { site: string; views: number; minutes: number }
    >();
    for (const r of insightDetailsRows) {
      const type = String(r[0] || "");
      const detail = String(r[1] || "");
      const v = Number(r[2] || 0);
      const minutes = Number(r[3] || 0);
      if (!detail) continue;
      if (type === "YT_SEARCH") {
        const prev = searchMap.get(detail);
        searchMap.set(detail, {
          term: detail,
          views: (prev?.views || 0) + v,
          minutes: (prev?.minutes || 0) + minutes,
        });
      }
      if (type === "EXT_URL") {
        const prev = extMap.get(detail);
        extMap.set(detail, {
          site: detail,
          views: (prev?.views || 0) + v,
          minutes: (prev?.minutes || 0) + minutes,
        });
      }
    }

    // overwrite the arrays if combined query provided them
    (searchTerms as any).length = 0;
    for (const it of Array.from(searchMap.values()).sort(
      (a, b) => b.views - a.views,
    )) {
      (searchTerms as any).push({
        term: it.term,
        views: it.views,
        watchTimeHours: it.minutes / 60,
      });
    }

    (externalSites as any).length = 0;
    for (const it of Array.from(extMap.values()).sort(
      (a, b) => b.views - a.views,
    )) {
      (externalSites as any).push({
        site: it.site,
        views: it.views,
        watchTimeHours: it.minutes / 60,
      });
    }
  }

  const subscribedStatus = rows(subscribedStatusResp).map((r) => ({
    status: String(r[0] || ""),
    views: Number(r[1] || 0),
    watchTimeHours: Number(r[2] || 0) / 60,
  }));

  const gender = rows(genderResp).map((r) => ({
    gender: String(r[0] || ""),
    viewerPercentage: Number(r[1] || 0),
  }));

  const ageGroups = rows(ageResp).map((r) => ({
    ageGroup: String(r[0] || ""),
    viewerPercentage: Number(r[1] || 0),
  }));

  const countries = rows(countriesResp).map((r) => ({
    country: String(r[0] || ""),
    views: Number(r[1] || 0),
    watchTimeHours: Number(r[2] || 0) / 60,
  }));

  const devices = rows(devicesResp).map((r) => ({
    deviceType: String(r[0] || ""),
    views: Number(r[1] || 0),
    watchTimeHours: Number(r[2] || 0) / 60,
  }));

  const operatingSystems = rows(osResp).map((r) => ({
    os: String(r[0] || ""),
    views: Number(r[1] || 0),
    watchTimeHours: Number(r[2] || 0) / 60,
  }));

  const curve = rows(retentionCurveResp).map((r) => ({
    elapsedVideoTimeRatio: Number(r[0] || 0),
    audienceWatchRatio: r.length >= 2 ? Number(r[1] || 0) : null,
    relativeRetentionPerformance: r.length >= 3 ? Number(r[2] || 0) : null,
  }));

  const viewsByHour: Array<{ hour: string; views: number }> = [];

  // Note: we intentionally avoid adding static/hardcoded limitation entries.

  return {
    video: {
      id: item.id,
      title: item.snippet?.title || null,
      description: item.snippet?.description || null,
      publishedAt,
      duration: item.contentDetails?.duration || null,
      thumbnails: item.snippet?.thumbnails || null,
      channelId: item.snippet?.channelId || null,
      channelTitle: item.snippet?.channelTitle || null,
      privacyStatus: item.status?.privacyStatus || null,
      statistics: {
        viewCount: dataViews,
        likeCount: dataLikes,
        commentCount: dataComments,
        favoriteCount: dataFav,
      },
    },
    overview: {
      views: overviewResp ? ovViews : dataViews,
      watchTimeHours: overviewResp ? ovMinutes / 60 : 0,
      averageViewDuration: overviewResp
        ? secondsToHMS(ovAvgDurSec)
        : "00:00:00",
      likes: dataLikes,
      comments: dataComments,
      engagedViews: overviewResp ? ovEngagedViews : null,
    },
    reach: {
      impressions,
      impressionsCtr,
      trafficSources,
      searchTerms,
      externalSites,
    },
    engagement: {
      averageViewPercentage: engagementResp ? Number(en[0] || 0) : null,
      shares: engagementResp ? Number(en[1] || 0) : null,
      subscribersGained: engagementResp ? Number(en[2] || 0) : null,
      subscribersLost: engagementResp ? Number(en[3] || 0) : null,
      playlistAdds: engagementResp ? Number(en[4] || 0) : null,
      playlistRemoves: engagementResp ? Number(en[5] || 0) : null,
    },
    audience: {
      subscribedStatus,
      gender,
      ageGroups,
      countries,
      devices,
      operatingSystems,
    },
    retention: {
      averageViewDuration: overviewResp
        ? secondsToHMS(ovAvgDurSec)
        : "00:00:00",
      averageViewPercentage: overviewResp ? ovAvgPct : null,
      curve,
    },
    realtime: {
      window: "48h",
      viewsByHour,
    },
    limitations,
  };
};
