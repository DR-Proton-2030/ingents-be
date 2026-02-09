import { getPageProfile } from "./page.service";
import {
  fetchPostsInWindow,
  fetchVideosInWindow,
  getTopContent,
  sumPostEngagement,
} from "./content.service";
import {
  getFollowersDelta,
  getTotalsForWindow,
  getViewsOverTimeDaily,
} from "./insights.service";
import {
  getFollowersVsNonFollowersViews,
  getDemographics,
} from "./audience.service";
import { getTrafficSources } from "./traffic.service";

export type WindowPreset = "7d" | "28d" | "90d";
export type DateWindow = { sinceISO: string; untilISO: string };

function isoDateDaysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
}

function resolveWindow(preset: WindowPreset): DateWindow {
  const nowISO = new Date().toISOString().split("T")[0];
  switch (preset) {
    case "7d":
      return { sinceISO: isoDateDaysAgo(7), untilISO: nowISO };
    case "90d":
      return { sinceISO: isoDateDaysAgo(90), untilISO: nowISO };
    case "28d":
    default:
      return { sinceISO: isoDateDaysAgo(28), untilISO: nowISO };
  }
}

// Build a Facebook dashboard-style response using only supported Meta Graph API metrics
export async function buildFacebookDashboardBuilder(
  pageId: string,
  accessToken: string,
  preset: WindowPreset = "28d",
) {
  const window = resolveWindow(preset);

  // Header: page profile
  const page = await getPageProfile(pageId, accessToken);

  // Content: posts/videos in window
  const [posts, videos] = await Promise.all([
    fetchPostsInWindow(pageId, accessToken, window, 50),
    fetchVideosInWindow(pageId, accessToken, window, 100),
  ]);

  const topContent48hWindow: DateWindow = {
    sinceISO: isoDateDaysAgo(2),
    untilISO: new Date().toISOString().split("T")[0],
  };
  const videos48h = await fetchVideosInWindow(
    pageId,
    accessToken,
    topContent48hWindow,
    50,
  );
  const topContent48h = await getTopContent(videos48h, accessToken, 5);

  // Overview totals
  const videoIds = videos.map((v) => v.id);
  const totals = await getTotalsForWindow(pageId, accessToken, videoIds);
  const followersDelta = await getFollowersDelta(pageId, accessToken, window);
  const viewsOverTime = await getViewsOverTimeDaily(
    pageId,
    accessToken,
    window,
  );

  // Content section
  const publishedContent = [
    ...videos.map((v) => ({
      id: v.id,
      type: "video",
      title: v.title || v.description || "",
      permalink_url: v.permalink_url,
      created_time: v.created_time,
      thumbnail: v.thumbnails?.data?.[0]?.uri,
    })),
    ...posts.map((p) => ({
      id: p.id,
      type: p.type || "post",
      title: p.message || "",
      permalink_url: p.permalink_url,
      created_time: p.created_time,
      thumbnail: p.full_picture,
    })),
  ];

  // Engagement totals via supported post fields; over-time breakdown not available as an official metric
  const engagementTotals = sumPostEngagement(posts);

  // Audience: followers vs non-followers and demographics
  const followerSplit = await getFollowersVsNonFollowersViews(
    videoIds,
    accessToken,
  );
  const demographics = await getDemographics(pageId, accessToken);

  // Traffic sources: not available in Meta Graph API for pages
  const trafficSources = getTrafficSources();

  // Content Performance (Impressions): Not available as a full CTR/watch flow
  const impressionsUnavailable = true;

  return {
    page: page || {},
    overview: {
      views: totals.views,
      views3s: totals.views3s,
      views1m: totals.views1m,
      watchTime: totals.watchTime,
      threeSecondViewsUnavailable: totals.threeSecondViewsUnavailable,
      oneMinuteViewsUnavailable: totals.oneMinuteViewsUnavailable,
      followersGained: followersDelta.followersGained,
      followersLost: followersDelta.followersLost,
      netFollowers: followersDelta.netFollowers,
      viewsOverTime,
      topContent: topContent48h, // surface recent top to mirror Studio-like view
    },
    content: {
      totalViews: totals.views,
      publishedContent,
      viewerTypeUnavailable: true, // Meta does not provide new vs returning viewers segmentation
      viewerTypes: [],
    },
    engagement: {
      totals: engagementTotals,
      engagementOverTimeUnavailable: true, // No official daily engagement metric across posts
    },
    audience: {
      followers: page?.fan_count || 0,
      totalViews: totals.views,
      ...followerSplit,
      demographics,
    },
    trafficSources,
    impressions: {
      impressionsUnavailable,
      reason: "Not available via Meta Graph API",
      impressions: 0,
      ctr: 0,
      watchTimeFromImpressions: 0,
    },
  };
}
