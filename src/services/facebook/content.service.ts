import axios from "axios";
import { getRecentPosts, getRecentVideos } from "./page";
import { getVideoInsights, VideoInsight } from "./insights/videoInsights";
import UserModel from "../../models/users/users.model";
import PostedContentModel from "../../models/postedContent/postedContent.model";
import { getPageTokenService } from "./facebook.service";

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


// New Functions 


interface PostAnalytics {
  likes: number;
  comments: number;
  shares: number;
  views: number;
}

export async function getFbPostAnalytics(
  pageId: string,
  postId: string,
  accessToken: string,
): Promise<PostAnalytics> {
  // Try to use the ID as provided first. 
  // If it doesn't have an underscore, it might be a direct Photo/Video object.
  const targetId = postId;

  try {
    // Get basic info to identify the object or its story ID
    const infoRes = await axios.get(`https://graph.facebook.com/v20.0/${targetId}`, {
      params: {
        fields: "id,page_story_id",
        access_token: accessToken,
      },
    }).catch(async (err) => {
      // If direct ID failed, try prefixing it (standard Post ID format)
      if (!postId.includes("_")) {
        return await axios.get(`https://graph.facebook.com/v20.0/${pageId}_${postId}`, {
          params: {
            fields: "id,page_story_id",
            access_token: accessToken,
          },
        });
      }
      throw err;
    });

    const data = infoRes.data;
    // page_story_id is the actual Post that shows up in the feed for a Photo
    const actualId = data.page_story_id || data.id;

    // Get engagement counts
    let likes = 0;
    let comments = 0;
    let shares = 0;

    try {
      // Try Post-style metrics first (reactions/shares)
      const engagementRes = await axios.get(
        `https://graph.facebook.com/v20.0/${actualId}`,
        {
          params: {
            fields: "shares,reactions.limit(0).summary(true),comments.limit(0).summary(true)",
            access_token: accessToken,
          },
        },
      );
      likes = engagementRes.data.reactions?.summary?.total_count || 0;
      comments = engagementRes.data.comments?.summary?.total_count || 0;
      shares = engagementRes.data.shares?.count || 0;
    } catch (e) {
      // Fallback for objects that only support direct 'likes' connection
      try {
        const engagementRes = await axios.get(
          `https://graph.facebook.com/v20.0/${actualId}`,
          {
            params: {
              fields: "likes.limit(0).summary(true),comments.limit(0).summary(true)",
              access_token: accessToken,
            },
          },
        );
        likes = engagementRes.data.likes?.summary?.total_count || 0;
        comments = engagementRes.data.comments?.summary?.total_count || 0;
      } catch (innerE) {
        // Silently fail if engagement cannot be retrieved
      }
    }

    // Get views (insights) - only if it has a post ID format
    let views = 0;
    if (actualId.includes("_")) {
      try {
        // We try post_impressions as a proxy for views on non-video posts
        const insightsRes = await axios.get(
          `https://graph.facebook.com/v20.0/${actualId}/insights`,
          {
            params: {
              metric: "post_impressions",
              access_token: accessToken,
            },
          },
        );
        views = insightsRes.data.data?.[0]?.values?.[0]?.value || 0;
      } catch (e) {
        // If impressions fail, try video views if it might be a video
        try {
          const insightsRes = await axios.get(
            `https://graph.facebook.com/v20.0/${actualId}/insights`,
            {
              params: {
                metric: "post_video_views",
                access_token: accessToken,
              },
            },
          );
          views = insightsRes.data.data?.[0]?.values?.[0]?.value || 0;
        } catch (videoE) {
          // No views available
        }
      }
    }

    return {
      likes,
      comments,
      shares,
      views,
    };
  } catch (err: any) {
    console.error(
      `FB Graph API error for ${postId}:`,
      err.response?.data || err.message,
    );
    throw err;
  }
}

/**
 * Finds all Facebook posts in PostedContentModel for a user,
 * fetches their latest engagement metrics, and updates the database.
 */
export async function updateFbAllPostsEngagement(userId: string) {
  try {
    const posts = await PostedContentModel.find({
      user_id: userId,
      platform: "facebook",
      status: "published",
      platform_post_id: { $ne: null },
    });

    if (!posts.length) {
      console.log(`No Facebook posts found for user ${userId}`);
      return;
    }

    // Group posts by page_id to minimize token lookups
    const postsByPage: Record<string, typeof posts> = {};
    posts.forEach((p) => {
      if (p.page_id) {
        if (!postsByPage[p.page_id]) postsByPage[p.page_id] = [];
        postsByPage[p.page_id].push(p);
      }
    });

    for (const [pageId, pagePosts] of Object.entries(postsByPage)) {
      try {
        const { pageAccessToken } = await getPageTokenService(userId, pageId);

        for (const post of pagePosts) {
          try {
            // platform_post_id might be "pageId_postId" or just "postId"
            let postId = post.platform_post_id!;

            const analytics = await getFbPostAnalytics(
              pageId,
              postId,
              pageAccessToken,
            );

            await PostedContentModel.findByIdAndUpdate(post._id, {
              $set: {
                engagement: {
                  likes: analytics.likes,
                  comments: analytics.comments,
                  shares: analytics.shares,
                  views: analytics.views,
                },
              },
            });
          } catch (postErr: any) {
            console.error(
              `Failed to update engagement for post ${post.platform_post_id}:`,
              postErr.message,
            );
          }
        }
      } catch (tokenErr: any) {
        console.error(
          `Failed to get page token for page ${pageId}:`,
          tokenErr.message,
        );
      }
    }

    console.log(`Successfully updated engagement for ${posts.length} Facebook posts`);
  } catch (err: any) {
    console.error("Error in updateFbAllPostsEngagement:", err);
    throw err;
  }
}