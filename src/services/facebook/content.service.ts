import axios from "axios";
import { getRecentPosts, getRecentVideos } from "./page";
import { getVideoInsights, VideoInsight } from "./insights/videoInsights";

const FACEBOOK_GRAPH_URL = "https://graph.facebook.com/v20.0";

export type DateWindow = { sinceISO: string; untilISO: string };

export type VideoItem = {
  id: string;
  title?: string;
  description?: string;
  thumbnails?: { data?: Array<{ uri?: string }> };
  created_time?: string;
  permalink_url?: string;
  length?: number;
};

export type PostItem = {
  id: string;
  message?: string;
  type?: string;
  permalink_url?: string;
  created_time?: string;
  full_picture?: string;
  reactions?: { summary?: { total_count?: number } };
  shares?: { count?: number };
  comments?: { summary?: { total_count?: number } };
};

export async function fetchPostsInWindow(
  pageId: string,
  accessToken: string,
  window: DateWindow,
  limit = 50,
): Promise<PostItem[]> {
  // Extend fields to include engagement summaries (supported)
  const url = `${FACEBOOK_GRAPH_URL}/${pageId}/posts`;
  const fields = [
    "id",
    "created_time",
    "message",
    "permalink_url",
    "full_picture",
    "type",
    "reactions.summary(true)",
    "shares",
    "comments.summary(true)",
  ].join(",");
  try {
    const resp = await axios.get(url, {
      params: {
        since: window.sinceISO,
        until: window.untilISO,
        limit,
        fields,
      },
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return resp.data?.data || [];
  } catch (_) {
    return [];
  }
}

export async function fetchVideosInWindow(
  pageId: string,
  accessToken: string,
  window: DateWindow,
  limit = 100,
): Promise<VideoItem[]> {
  return getRecentVideos(
    pageId,
    accessToken,
    window.sinceISO,
    window.untilISO,
    limit,
  );
}

export type TopContentItem = {
  id: string;
  title: string;
  thumbnail?: string;
  created_time?: string;
  views: number;
  viewTime: number;
  permalink_url?: string;
};

// Build top content from videos ranked by views and view time
export async function getTopContent(
  videos: VideoItem[],
  accessToken: string,
  maxItems = 5,
): Promise<TopContentItem[]> {
  const items: TopContentItem[] = [];
  for (const v of videos) {
    const insights: VideoInsight[] = await getVideoInsights(v.id, accessToken, [
      "total_video_views",
      "total_video_view_time",
    ]);
    const views =
      insights.find((i) => i.name === "total_video_views")?.values?.[0]
        ?.value || 0;
    const viewTime =
      insights.find((i) => i.name === "total_video_view_time")?.values?.[0]
        ?.value || 0;
    items.push({
      id: v.id,
      title: v.title || v.description || "",
      thumbnail: v.thumbnails?.data?.[0]?.uri,
      created_time: v.created_time,
      views,
      viewTime,
      permalink_url: v.permalink_url,
    });
  }
  items.sort((a, b) =>
    b.views === a.views
      ? (b.viewTime || 0) - (a.viewTime || 0)
      : b.views - a.views,
  );
  return items.slice(0, maxItems);
}

export function sumPostEngagement(posts: PostItem[]) {
  let reactions = 0;
  let comments = 0;
  let shares = 0;
  for (const p of posts) {
    reactions += p.reactions?.summary?.total_count || 0;
    comments += p.comments?.summary?.total_count || 0;
    shares += p.shares?.count || 0;
  }
  return { reactions, comments, shares, total: reactions + comments + shares };
}
