import { getPageInsights } from "./insights/pageInsights";
import { getVideoInsights } from "./insights/videoInsights";
import { getRecentPosts, getRecentVideos, getPageDetails } from "./page";

type DateRange = { sinceISO: string; untilISO: string };

// Minimal types for Graph API responses used here
type FacebookVideo = {
  id: string;
  title?: string;
  description?: string;
  thumbnails?: { data?: Array<{ uri?: string }> };
  created_time?: string;
  permalink_url?: string;
  length?: number;
};

type FacebookPost = {
  id: string;
  message?: string;
  type?: string;
  permalink_url?: string;
  created_time?: string;
  full_picture?: string;
};

type TopContentItem = {
  id: string;
  title: string;
  thumbnail?: string;
  created_time?: string;
  views: number;
  viewTime: number;
  permalink_url?: string;
};

function isoDateDaysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
}

export async function buildFacebookDashboard(
  pageId: string,
  accessToken: string,
) {
  const last48h: DateRange = {
    sinceISO: isoDateDaysAgo(2),
    untilISO: new Date().toISOString().split("T")[0],
  };
  const last28d: DateRange = {
    sinceISO: isoDateDaysAgo(28),
    untilISO: new Date().toISOString().split("T")[0],
  };

  // Fetch page details for header
  const page = await getPageDetails(pageId, accessToken);

  // 1) Top Content (last 48 hours) — rank by video views and view time when available
  const recentVideos48h: FacebookVideo[] = await getRecentVideos(
    pageId,
    accessToken,
    last48h.sinceISO,
    last48h.untilISO,
    50,
  );
  const topContent48h: TopContentItem[] = [];
  for (const v of recentVideos48h) {
    const insights = await getVideoInsights(v.id, accessToken, [
      // Official metrics available on video assets; some pages may lack them
      "total_video_views",
      "total_video_view_time",
    ]);
    const views =
      insights.find((i) => i.name === "total_video_views")?.values?.[0]
        ?.value || 0;
    const viewTime =
      insights.find((i) => i.name === "total_video_view_time")?.values?.[0]
        ?.value || 0;
    topContent48h.push({
      id: v.id,
      title: v.title || v.description || "",
      thumbnail: v.thumbnails?.data?.[0]?.uri,
      created_time: v.created_time,
      views,
      viewTime,
      permalink_url: v.permalink_url,
    });
  }
  topContent48h.sort((a, b) => {
    if (b.views === a.views) return (b.viewTime || 0) - (a.viewTime || 0);
    return b.views - a.views;
  });
  const topContent48hLimited = topContent48h.slice(0, 5);

  // 2) Overview (last 28 days)
  // Totals: video views, watch time, followers gained/lost (net), top content
  const recentVideos28d: FacebookVideo[] = await getRecentVideos(
    pageId,
    accessToken,
    last28d.sinceISO,
    last28d.untilISO,
    100,
  );
  let totalViews28d = 0;
  let totalWatchTime28d = 0;
  const videoInsightsCache: Record<string, any> = {};
  for (const v of recentVideos28d) {
    const ins = await getVideoInsights(v.id, accessToken, [
      "total_video_views",
      "total_video_view_time",
    ]);
    videoInsightsCache[v.id] = ins;
    totalViews28d +=
      ins.find((i: any) => i.name === "total_video_views")?.values?.[0]
        ?.value || 0;
    totalWatchTime28d +=
      ins.find((i: any) => i.name === "total_video_view_time")?.values?.[0]
        ?.value || 0;
  }

  const fanAddsRemoves = await getPageInsights(
    pageId,
    accessToken,
    ["page_fan_adds", "page_fan_removes"],
    last28d.sinceISO,
    last28d.untilISO,
    "day",
  );
  const adds =
    fanAddsRemoves.find((i) => i.name === "page_fan_adds")?.values || [];
  const removes =
    fanAddsRemoves.find((i) => i.name === "page_fan_removes")?.values || [];
  const followersGained = adds.reduce(
    (sum, r) => sum + (Number(r.value) || 0),
    0,
  );
  const followersLost = removes.reduce(
    (sum, r) => sum + (Number(r.value) || 0),
    0,
  );
  const netFollowers = followersGained - followersLost;

  const topContent28d = recentVideos28d
    .map((v) => {
      const ins = videoInsightsCache[v.id] || [];
      const views =
        ins.find((i: any) => i.name === "total_video_views")?.values?.[0]
          ?.value || 0;
      const viewTime =
        ins.find((i: any) => i.name === "total_video_view_time")?.values?.[0]
          ?.value || 0;
      return {
        id: v.id,
        title: v.title || v.description || "",
        thumbnail: v.thumbnails?.data?.[0]?.uri,
        created_time: v.created_time,
        views,
        viewTime,
        permalink_url: v.permalink_url,
      };
    })
    .sort((a, b) =>
      b.views === a.views
        ? (b.viewTime || 0) - (a.viewTime || 0)
        : b.views - a.views,
    )
    .slice(0, 5);

  // 3) Content Tab
  const publishedPosts28d: FacebookPost[] = await getRecentPosts(
    pageId,
    accessToken,
    last28d.sinceISO,
    last28d.untilISO,
    50,
  );
  const contentTab = {
    totalViews: totalViews28d, // proxy overall video views
    publishedContent: [
      // Merge videos and posts; videos carry views, posts carry basic metadata
      ...recentVideos28d.map((v) => ({
        id: v.id,
        type: "video",
        title: v.title || v.description || "",
        permalink_url: v.permalink_url,
        created_time: v.created_time,
        thumbnail: v.thumbnails?.data?.[0]?.uri,
      })),
      ...publishedPosts28d.map((p) => ({
        id: p.id,
        type: p.type || "post",
        title: p.message || "",
        permalink_url: p.permalink_url,
        created_time: p.created_time,
        thumbnail: p.full_picture,
      })),
    ],
    // Meta does not provide "new vs returning viewers" segmentation like YouTube
    viewerTypeUnavailable: true,
    viewerTypes: [],
  };

  // 4) Content Performance (Impressions Flow)
  // Meta does not provide CTR-to-watch-time attribution; set zeros and flag unavailability
  const pagePostsImpressions = await getPageInsights(
    pageId,
    accessToken,
    ["page_posts_impressions"],
    last28d.sinceISO,
    last28d.untilISO,
    "day",
  );
  const impressionsTotal = (pagePostsImpressions[0]?.values || []).reduce(
    (sum, r) => sum + (Number(r.value) || 0),
    0,
  );
  const contentPerformance = {
    impressions: impressionsTotal || 0,
    ctr: 0,
    watchTimeFromImpressions: 0,
    impressionsFlowUnavailable: true,
  };

  // 5) Traffic Sources — not exposed by Meta for Pages
  const trafficSources = {
    sources: [],
    trafficSourcesUnavailable: true,
  };

  // 6) Audience Tab (last 28 days)
  // Attempt to split views by followers vs non-followers if metrics exist; otherwise mark as unavailable.
  let followerViews = 0;
  let nonFollowerViews = 0;
  for (const v of recentVideos28d) {
    const ins = await getVideoInsights(v.id, accessToken, [
      // These may be unavailable depending on page/app
      "total_video_views_follower",
      "total_video_views_non_follower",
    ]);
    followerViews +=
      ins.find((i: any) => i.name === "total_video_views_follower")?.values?.[0]
        ?.value || 0;
    nonFollowerViews +=
      ins.find((i: any) => i.name === "total_video_views_non_follower")
        ?.values?.[0]?.value || 0;
  }
  const audience = {
    totalViews: totalViews28d,
    followers: page?.fan_count || 0,
    watchTimeSplitUnavailable: !(followerViews || nonFollowerViews),
    watchTimeSplit: [
      { label: "Followers", value: followerViews },
      { label: "Non-followers", value: nonFollowerViews },
    ],
  };

  return {
    page: page || {},
    topContent48h: topContent48hLimited,
    overview28d: {
      views: totalViews28d,
      watchTime: totalWatchTime28d,
      followersGained,
      followersLost,
      netFollowers,
      topContent: topContent28d,
    },
    contentTab,
    contentPerformance,
    trafficSources,
    audience,
  };
}
