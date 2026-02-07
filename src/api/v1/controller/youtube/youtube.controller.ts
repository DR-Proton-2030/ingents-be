import { Request, Response } from "express";
import { google, youtube_v3 } from "googleapis";
import { Readable } from "stream";
import { config } from "dotenv";
import UserModel from "../../../../models/users/users.model";
import PostedContentModel from "../../../../models/postedContent/postedContent.model";
import ScheduledPostModel from "../../../../models/scheduledPost/scheduledPost.model";
import axios from "axios";
import {
  getAuthorizedClient,
  resolveYouTubePublishAt,
} from "../../../../services/youtube/youtube.service";
config();

const YT_CLIENT_ID = process.env.YT_CLIENT_ID!;
const YT_CLIENT_SECRET = process.env.YT_CLIENT_SECRET!;
const YT_REDIRECT_URI = process.env.YT_REDIRECT_URI!;

const oauth2Client = new google.auth.OAuth2(
  YT_CLIENT_ID,
  YT_CLIENT_SECRET,
  YT_REDIRECT_URI,
);

export const youtubeAuth = (req: Request, res: Response) => {
  const appUserId = req.query.user_id as string;

  if (!appUserId) {
    return res.status(400).json({
      success: false,
      message: "user_id is required",
    });
  }

  const scopes = [
    "https://www.googleapis.com/auth/youtube",
    "https://www.googleapis.com/auth/youtube.readonly",
    "https://www.googleapis.com/auth/youtube.upload",
    "https://www.googleapis.com/auth/youtube.force-ssl",
    "https://www.googleapis.com/auth/yt-analytics.readonly",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/userinfo.email",
  ];

  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: scopes,
    state: Buffer.from(appUserId).toString("base64"), // encode user_id
  });

  res.redirect(url);
};

export const youtubeCallback = async (req: Request, res: Response) => {
  const { code, state } = req.query;
  console.log("Code and state <=======>", code, state);

  if (!state || typeof state !== "string") {
    return res.status(400).json({
      success: false,
      message: "State parameter is missing",
    });
  }

  const user_id = atob(state);
  console.log("<======> user id : ", user_id);

  // Validate user_id is a valid ObjectId (24 hex characters)
  if (
    !user_id ||
    user_id === "undefined" ||
    !/^[a-fA-F0-9]{24}$/.test(user_id)
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid user_id in state parameter",
    });
  }

  if (!code || typeof code !== "string") {
    return res.status(400).json({
      success: false,
      message: "Authorization code is missing or invalid",
    });
  }
  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    console.log("Access Token:", tokens.access_token);
    console.log("Refresh Token:", tokens.refresh_token);
    if (user_id) {
      const updateData: any = {};
      if (tokens.refresh_token) {
        updateData["youtube.access_token"] = tokens.refresh_token;
      }

      if (Object.keys(updateData).length > 0) {
        await UserModel.findByIdAndUpdate(
          { _id: user_id },
          { $set: updateData },
          { new: true },
        );
      }
    }
    // res.redirect(
    //   `http://localhost:5173/user-details/youtube-dashboard?token=${tokens.access_token}&user_id=${userId}`
    // );
    res.redirect(
      `${process.env.FRONTEND_URL}/dashboard/social-media?platform=youtube&token=${tokens.access_token}&user_id=${user_id}`,
    );
  } catch (error) {
    console.error("Error exchanging code:", error);
    res.status(500).json({
      success: false,
      messge: "Internal server errror!",
    });
  }
};

export const disconnectYoutube = async (req: Request, res: Response) => {
  try {
    const userId =
      (req.body?.userId as string) ||
      (req.body?.user_id as string) ||
      (req.query?.userId as string) ||
      (req.query?.user_id as string);

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId is required",
      });
    }

    const user = await UserModel.findById(userId).exec();
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const tokenToRevoke = user.youtube?.access_token;

    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      {
        $set: {
          "youtube.project_id": null,
          "youtube.name": null,
          "youtube.access_token": null,
        },
      },
      { new: true },
    ).exec();

    if (tokenToRevoke) {
      try {
        await axios.post(
          "https://oauth2.googleapis.com/revoke",
          new URLSearchParams({ token: tokenToRevoke }),
          {
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
          },
        );
      } catch (revokeErr: any) {
        console.warn(
          "Failed to revoke YouTube token:",
          revokeErr?.response?.data || revokeErr?.message || revokeErr,
        );
      }
    }

    return res.status(200).json({
      success: true,
      message: "YouTube disconnected successfully",
      user: updatedUser,
    });
  } catch (error: any) {
    console.error("Error disconnecting YouTube:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to disconnect YouTube",
      error: error.message,
    });
  }
};

export const getYoutubeChannelDetails = async (req: Request, res: Response) => {
  try {
    const accessToken = req.headers.authorization?.split(" ")[1];
    if (!accessToken) {
      return res
        .status(401)
        .json({ success: false, message: "No access token provided" });
    }

    oauth2Client.setCredentials({ access_token: accessToken });

    const youtube = google.youtube({ version: "v3", auth: oauth2Client });
    // Get the channel of the authenticated user
    const response = await youtube.channels.list({
      part: ["snippet", "statistics"],
      mine: true,
    });

    console.log("Youtube channel : ", response);

    if (!response.data.items || response.data.items.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No channel found" });
    }

    const channel = response.data.items[0];

    const details = {
      id: channel.id,
      name: channel.snippet?.title,
      description: channel.snippet?.description,
      publishedAt: channel.snippet?.publishedAt,
      thumbnails: channel.snippet?.thumbnails,
      statistics: channel.statistics,
    };

    res.status(200).json({
      success: true,
      result: details,
    });
  } catch (error) {
    console.error("Error fetching channel details:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch channel details" });
  }
};

// Upload video
export const uploadYoutubeVideo = async (req: Request, res: Response) => {
  try {
    const {
      user_id,
      title,
      description,
      tags,
      privacyStatus,
      videoURL,
      thumbnailDataUrl,
    } = req.body;
    const { iso: publishAtISO, error: scheduleError } = resolveYouTubePublishAt(
      req.body,
    );

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: "User id required",
      });
    }
    if (!videoURL && !req.file) {
      return res.status(400).json({
        success: false,
        message: "No video source provided (file or URL)",
      });
    }

    const user = await UserModel.findById(user_id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    if (!user.youtube || !user.youtube.access_token) {
      return res.status(400).json({
        success: false,
        message: "User does not have a valid YouTube access token",
      });
    }

    // Setup OAuth client
    oauth2Client.setCredentials({
      refresh_token: user.youtube.access_token,
    });

    const accessTokenResponse = await oauth2Client.getAccessToken();

    oauth2Client.setCredentials({
      access_token: accessTokenResponse?.token || user.youtube.access_token,
      refresh_token: user.youtube.access_token,
    });

    const youtube = google.youtube({ version: "v3", auth: oauth2Client });

    let videoStream: any;
    if (req.file) {
      videoStream = Readable.from(req.file.buffer);
    } else if (videoURL) {
      const response = await axios.get(videoURL, { responseType: "stream" });
      videoStream = response.data;
    } else {
      return res.status(400).json({
        success: false,
        message: "No video source provided (file or URL)",
      });
    }

    // Upload video to YouTube
    if (scheduleError) {
      return res.status(400).json({ success: false, message: scheduleError });
    }

    const status: youtube_v3.Schema$VideoStatus = {
      privacyStatus: privacyStatus || "public",
    };
    if (publishAtISO) {
      // Scheduled publishing requires initial privacyStatus to be private
      status.privacyStatus = "private";
      status.publishAt = publishAtISO;
    }

    const uploadResponse = await youtube.videos.insert({
      part: ["snippet", "status"],
      requestBody: {
        snippet: {
          title: title || "Untitled Video",
          description: description || "",
          tags:
            typeof tags === "string"
              ? tags.split(",").map((t) => t.trim())
              : tags || [],
        },
        status,
      },
      media: {
        body: videoStream,
      },
    });

    const videoId = uploadResponse.data.id;

    let thumbnailResult: any = null;
    let thumbnailError: string | null = null;
    if (
      videoId &&
      typeof thumbnailDataUrl === "string" &&
      thumbnailDataUrl.startsWith("data:")
    ) {
      try {
        const match = thumbnailDataUrl.match(/^data:(.+);base64,(.+)$/);
        if (!match) {
          throw new Error("Invalid thumbnailDataUrl format");
        }
        const base64 = match[2];
        const buffer = Buffer.from(base64, "base64");
        thumbnailResult = await youtube.thumbnails.set({
          videoId,
          media: {
            body: Readable.from(buffer),
          },
        });
      } catch (thumbErr: any) {
        thumbnailError =
          thumbErr?.response?.data?.error?.message ||
          thumbErr?.errors?.[0]?.message ||
          thumbErr?.message ||
          String(thumbErr);
        console.warn("Failed to set YouTube thumbnail:", thumbnailError);
      }
    }

    if (publishAtISO) {
      // Save scheduled video to database
      await ScheduledPostModel.create({
        user_id,
        platform: "youtube",
        content: title || "Untitled Video",
        media_urls: [videoURL || `https://www.youtube.com/watch?v=${videoId}`],
        media_type: "video",
        scheduled_at: new Date(publishAtISO),
        status: "completed",
        platform_specific_data: {
          description,
          tags,
          videoId,
          privacyStatus: status.privacyStatus,
          thumbnailSet: Boolean(thumbnailResult),
          thumbnailError,
        },
      });

      return res.status(200).json({
        success: true,
        scheduled: true,
        details: {
          id: videoId,
          title: title || uploadResponse.data.snippet?.title,
          scheduledAt: publishAtISO,
          privacyStatus: status.privacyStatus,
          videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
          thumbnailSet: Boolean(thumbnailResult),
          thumbnailError,
        },
        message: "Video scheduled for publishing",
      });
    }

    // Save posted video to database
    await PostedContentModel.create({
      user_id,
      platform: "youtube",
      content: title || "Untitled Video",
      media_urls: [videoURL || `https://www.youtube.com/watch?v=${videoId}`],
      posted_at: new Date(),
      platform_post_id: videoId,
      is_scheduled: false,
      status: "published",
      platform_specific_data: {
        description,
        tags,
        privacyStatus: privacyStatus || "public",
        videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
        thumbnailSet: Boolean(thumbnailResult),
        thumbnail: thumbnailResult?.data,
        thumbnailError,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Video uploaded successfully",
      videoId,
      videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
      thumbnailSet: Boolean(thumbnailResult),
      thumbnailError,
    });
  } catch (error: any) {
    console.error("Error uploading video:", error);
    return res.status(500).json({
      success: false,
      message: "Video upload failed",
      error: error.message,
    });
  }
};

export const getAllYoutubeVideos = async (req: Request, res: Response) => {
  try {
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: "User id required",
      });
    }

    const user = await UserModel.findById(user_id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    if (!user.youtube || !user.youtube.access_token) {
      return res.status(400).json({
        success: false,
        message: "User does not have a valid YouTube access token",
      });
    }

    oauth2Client.setCredentials({
      refresh_token: user.youtube.access_token,
    });

    const accessTokenResponse = await oauth2Client.getAccessToken();
    oauth2Client.setCredentials({
      access_token: accessTokenResponse?.token || user.youtube.access_token,
      refresh_token: user.youtube.access_token,
    });

    const youtube = google.youtube({ version: "v3", auth: oauth2Client });

    const channelResp = await youtube.channels.list({
      part: ["contentDetails"],
      mine: true,
    });

    if (!channelResp.data.items || channelResp.data.items.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No channel found",
      });
    }

    const uploadsPlaylistId =
      channelResp.data.items[0].contentDetails?.relatedPlaylists?.uploads;

    if (!uploadsPlaylistId) {
      return res.status(404).json({
        success: false,
        message: "Uploads playlist not found",
      });
    }

    const allVideos: Array<{
      id?: string | null;
      title?: string | null;
      description?: string | null;
      publishedAt?: string | null;
      thumbnails?: any;
      channelId?: string | null;
      // Enriched fields
      statistics?: youtube_v3.Schema$VideoStatistics | null;
      duration?: string | null;
      privacyStatus?: string | null;
      tags?: string[] | null;
    }> = [];

    let pageToken: string | undefined = undefined;

    do {
      const resp = await youtube.playlistItems.list({
        part: ["snippet", "contentDetails"],
        playlistId: uploadsPlaylistId,
        maxResults: 50,
        pageToken,
      });
      const data = resp.data as youtube_v3.Schema$PlaylistItemListResponse;
      const items = data.items || [];
      for (const item of items) {
        allVideos.push({
          id: item.contentDetails?.videoId || null,
          title: item.snippet?.title || null,
          description: item.snippet?.description || null,
          publishedAt:
            item.contentDetails?.videoPublishedAt ||
            item.snippet?.publishedAt ||
            null,
          thumbnails: item.snippet?.thumbnails,
          channelId: item.snippet?.channelId || null,
          statistics: null,
          duration: null,
          privacyStatus: null,
          tags: null,
        });
      }

      pageToken = data.nextPageToken || undefined;
    } while (pageToken);

    // Enrich with video details: statistics, contentDetails, status
    const videoIds = allVideos
      .map((v) => v.id)
      .filter((id): id is string => !!id);
    const chunk = <T>(arr: T[], size: number) => {
      const out: T[][] = [];
      for (let i = 0; i < arr.length; i += size)
        out.push(arr.slice(i, i + size));
      return out;
    };
    const idChunks = chunk(videoIds, 50);
    const detailsMap: Record<string, youtube_v3.Schema$Video> = {};
    for (const ids of idChunks) {
      const detailsResp = await youtube.videos.list({
        part: ["snippet", "statistics", "contentDetails", "status"],
        id: ids,
      });
      const details = (detailsResp.data.items ||
        []) as youtube_v3.Schema$Video[];
      for (const d of details) {
        if (d.id) detailsMap[d.id] = d;
      }
    }
    // Merge back into allVideos
    for (const v of allVideos) {
      const id = v.id || "";
      const d = id ? detailsMap[id] : undefined;
      if (d) {
        v.statistics = d.statistics || null;
        v.duration = d.contentDetails?.duration || null;
        v.privacyStatus = d.status?.privacyStatus || null;
        // Prefer tags from detailed snippet if present
        v.tags = (d.snippet?.tags as string[] | undefined) || v.tags || null;
      }
    }

    return res.status(200).json({
      success: true,
      result: allVideos,
    });
  } catch (error: any) {
    console.error("Error fetching videos:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch videos",
      error: error.message,
    });
  }
};

export const getVideoComments = async (req: Request, res: Response) => {
  try {
    const { user_id, videoId } = req.body;
    if (!user_id || !videoId) {
      return res.status(400).json({
        success: false,
        message: "user_id and videoId required",
      });
    }

    const user = await UserModel.findById(user_id);
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "User not found" });
    }
    if (!user.youtube || !user.youtube.access_token) {
      return res.status(400).json({
        success: false,
        message: "User does not have a valid YouTube access token",
      });
    }

    oauth2Client.setCredentials({ refresh_token: user.youtube.access_token });
    const accessTokenResponse = await oauth2Client.getAccessToken();
    oauth2Client.setCredentials({
      access_token: accessTokenResponse?.token || user.youtube.access_token,
      refresh_token: user.youtube.access_token,
    });

    const youtube = google.youtube({ version: "v3", auth: oauth2Client });

    const allComments: Array<{
      id?: string | null;
      text?: string | null;
      author?: string | null;
      publishedAt?: string | null;
      updatedAt?: string | null;
      likeCount?: number | null;
      totalReplyCount?: number | null;
      replies?: Array<{
        id?: string | null;
        text?: string | null;
        author?: string | null;
        publishedAt?: string | null;
        updatedAt?: string | null;
        likeCount?: number | null;
      }>;
    }> = [];

    let pageToken: string | undefined = undefined;
    do {
      const resp = await youtube.commentThreads.list({
        part: ["snippet", "replies"],
        videoId,
        maxResults: 50,
        pageToken,
      });
      const data = resp.data as youtube_v3.Schema$CommentThreadListResponse;
      for (const thread of data.items || []) {
        const top = thread.snippet?.topLevelComment?.snippet;
        const replies = (thread.replies?.comments ||
          []) as youtube_v3.Schema$Comment[];
        allComments.push({
          id: thread.snippet?.topLevelComment?.id || null,
          text: top?.textDisplay || null,
          author: top?.authorDisplayName || null,
          publishedAt: top?.publishedAt || null,
          updatedAt: top?.updatedAt || null,
          likeCount: top?.likeCount ?? null,
          totalReplyCount: thread.snippet?.totalReplyCount ?? null,
          replies: replies.map((r: youtube_v3.Schema$Comment) => ({
            id: r.id || null,
            text: r.snippet?.textDisplay || null,
            author: r.snippet?.authorDisplayName || null,
            publishedAt: r.snippet?.publishedAt || null,
            updatedAt: r.snippet?.updatedAt || null,
            likeCount: r.snippet?.likeCount ?? null,
          })),
        });
      }
      pageToken = data.nextPageToken || undefined;
    } while (pageToken);

    return res.status(200).json({ success: true, result: allComments });
  } catch (error: any) {
    console.error("Error fetching comments:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch comments",
      error: error.message,
    });
  }
};

export const addVideoComment = async (req: Request, res: Response) => {
  try {
    const { user_id, videoId, text } = req.body;
    if (!user_id || !videoId || !text) {
      return res.status(400).json({
        success: false,
        message: "user_id, videoId and text required",
      });
    }

    const user = await UserModel.findById(user_id);
    if (!user)
      return res
        .status(401)
        .json({ success: false, message: "User not found" });
    if (!user.youtube || !user.youtube.access_token) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid YouTube token" });
    }

    oauth2Client.setCredentials({ refresh_token: user.youtube.access_token });
    const accessTokenResponse = await oauth2Client.getAccessToken();
    oauth2Client.setCredentials({
      access_token: accessTokenResponse?.token || user.youtube.access_token,
      refresh_token: user.youtube.access_token,
    });

    const youtube = google.youtube({ version: "v3", auth: oauth2Client });

    const { data }: { data: youtube_v3.Schema$CommentThread } =
      await youtube.commentThreads.insert({
        part: ["snippet"],
        requestBody: {
          snippet: {
            videoId,
            topLevelComment: {
              snippet: { textOriginal: text },
            },
          },
        },
      });

    return res.status(200).json({
      success: true,
      result: {
        id: data.snippet?.topLevelComment?.id,
        text: data.snippet?.topLevelComment?.snippet?.textDisplay,
      },
    });
  } catch (error: any) {
    console.error("Error adding comment:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to add comment",
      error: error.message,
    });
  }
};

export const replyToYoutubeComment = async (req: Request, res: Response) => {
  try {
    const { user_id, parentCommentId, text } = req.body;
    if (!user_id || !parentCommentId || !text) {
      return res.status(400).json({
        success: false,
        message: "user_id, parentCommentId and text required",
      });
    }

    const user = await UserModel.findById(user_id);
    if (!user)
      return res
        .status(401)
        .json({ success: false, message: "User not found" });
    if (!user.youtube || !user.youtube.access_token) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid YouTube token" });
    }

    oauth2Client.setCredentials({ refresh_token: user.youtube.access_token });
    const accessTokenResponse = await oauth2Client.getAccessToken();
    oauth2Client.setCredentials({
      access_token: accessTokenResponse?.token || user.youtube.access_token,
      refresh_token: user.youtube.access_token,
    });

    const youtube = google.youtube({ version: "v3", auth: oauth2Client });

    const { data }: { data: youtube_v3.Schema$Comment } =
      await youtube.comments.insert({
        part: ["snippet"],
        requestBody: {
          snippet: {
            parentId: parentCommentId,
            textOriginal: text,
          },
        },
      });

    return res.status(200).json({
      success: true,
      result: { id: data.id, text: data.snippet?.textDisplay },
    });
  } catch (error: any) {
    console.error("Error replying to comment:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to reply to comment",
      error: error.message,
    });
  }
};

export const getSubscribers = async (req: Request, res: Response) => {
  try {
    const { user_id } = req.body;
    if (!user_id)
      return res
        .status(400)
        .json({ success: false, message: "User id required" });

    const user = await UserModel.findById(user_id);
    if (!user)
      return res
        .status(401)
        .json({ success: false, message: "User not found" });
    if (!user.youtube || !user.youtube.access_token) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid YouTube token" });
    }

    oauth2Client.setCredentials({ refresh_token: user.youtube.access_token });
    const accessTokenResponse = await oauth2Client.getAccessToken();
    oauth2Client.setCredentials({
      access_token: accessTokenResponse?.token || user.youtube.access_token,
      refresh_token: user.youtube.access_token,
    });

    const youtube = google.youtube({ version: "v3", auth: oauth2Client });

    const subscribers: Array<{
      channelId?: string | null;
      title?: string | null;
      thumbnails?: any;
      subscribedAt?: string | null;
    }> = [];

    let pageToken: string | undefined = undefined;
    do {
      const resp = await youtube.subscriptions.list({
        part: ["snippet", "subscriberSnippet"],
        mySubscribers: true,
        maxResults: 50,
        pageToken,
      });
      const data = resp.data as youtube_v3.Schema$SubscriptionListResponse;
      for (const item of data.items || []) {
        subscribers.push({
          channelId: item.subscriberSnippet?.channelId || null,
          title: item.subscriberSnippet?.title || null,
          thumbnails: item.subscriberSnippet?.thumbnails,
          subscribedAt: item.snippet?.publishedAt || null,
        });
      }
      pageToken = data.nextPageToken || undefined;
    } while (pageToken);

    return res.status(200).json({ success: true, result: subscribers });
  } catch (error: any) {
    console.error("Error fetching subscribers:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch subscribers",
      error: error.message,
    });
  }
};

export const getRecentSubscribers = async (req: Request, res: Response) => {
  try {
    const { user_id } = req.body;
    if (!user_id)
      return res
        .status(400)
        .json({ success: false, message: "User id required" });

    const user = await UserModel.findById(user_id);
    if (!user)
      return res
        .status(401)
        .json({ success: false, message: "User not found" });
    if (!user.youtube || !user.youtube.access_token) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid YouTube token" });
    }

    oauth2Client.setCredentials({ refresh_token: user.youtube.access_token });
    const accessTokenResponse = await oauth2Client.getAccessToken();
    oauth2Client.setCredentials({
      access_token: accessTokenResponse?.token || user.youtube.access_token,
      refresh_token: user.youtube.access_token,
    });

    const youtube = google.youtube({ version: "v3", auth: oauth2Client });

    const recent: Array<{
      channelId?: string | null;
      title?: string | null;
      thumbnails?: any;
      subscribedAt?: string | null;
    }> = [];

    let pageToken: string | undefined = undefined;
    do {
      const resp = await youtube.subscriptions.list({
        part: ["snippet", "subscriberSnippet"],
        myRecentSubscribers: true,
        maxResults: 50,
        pageToken,
      });
      const data = resp.data as youtube_v3.Schema$SubscriptionListResponse;
      for (const item of data.items || []) {
        recent.push({
          channelId: item.subscriberSnippet?.channelId || null,
          title: item.subscriberSnippet?.title || null,
          thumbnails: item.subscriberSnippet?.thumbnails,
          subscribedAt: item.snippet?.publishedAt || null,
        });
      }
      pageToken = data.nextPageToken || undefined;
    } while (pageToken);

    return res.status(200).json({ success: true, result: recent });
  } catch (error: any) {
    console.error("Error fetching recent subscribers:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch recent subscribers",
      error: error.message,
    });
  }
};

export const getUserSubscriptions = async (req: Request, res: Response) => {
  try {
    const { user_id } = req.body;
    if (!user_id)
      return res
        .status(400)
        .json({ success: false, message: "User id required" });

    const user = await UserModel.findById(user_id);
    if (!user)
      return res
        .status(401)
        .json({ success: false, message: "User not found" });
    if (!user.youtube || !user.youtube.access_token) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid YouTube token" });
    }

    oauth2Client.setCredentials({ refresh_token: user.youtube.access_token });
    const accessTokenResponse = await oauth2Client.getAccessToken();
    oauth2Client.setCredentials({
      access_token: accessTokenResponse?.token || user.youtube.access_token,
      refresh_token: user.youtube.access_token,
    });

    const youtube = google.youtube({ version: "v3", auth: oauth2Client });

    const subs: Array<{
      subscribedChannelId?: string | null;
      title?: string | null;
      thumbnails?: any;
      subscribedAt?: string | null;
    }> = [];

    let pageToken: string | undefined = undefined;
    do {
      const resp = await youtube.subscriptions.list({
        part: ["snippet"],
        mine: true,
        maxResults: 50,
        pageToken,
      });
      const data = resp.data as youtube_v3.Schema$SubscriptionListResponse;
      for (const item of data.items || []) {
        const resourceId = item.snippet?.resourceId;
        subs.push({
          subscribedChannelId: resourceId?.channelId || null,
          title: item.snippet?.title || null,
          thumbnails: item.snippet?.thumbnails,
          subscribedAt: item.snippet?.publishedAt || null,
        });
      }
      pageToken = data.nextPageToken || undefined;
    } while (pageToken);

    return res.status(200).json({ success: true, result: subs });
  } catch (error: any) {
    console.error("Error fetching subscriptions:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch subscriptions",
      error: error.message,
    });
  }
};

export const getVideoStatistics = async (req: Request, res: Response) => {
  try {
    const { user_id, videoId } = req.body;
    if (!user_id || !videoId)
      return res
        .status(400)
        .json({ success: false, message: "user_id and videoId required" });

    const user = await UserModel.findById(user_id);
    if (!user)
      return res
        .status(401)
        .json({ success: false, message: "User not found" });
    if (!user.youtube || !user.youtube.access_token) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid YouTube token" });
    }

    oauth2Client.setCredentials({ refresh_token: user.youtube.access_token });
    const accessTokenResponse = await oauth2Client.getAccessToken();
    oauth2Client.setCredentials({
      access_token: accessTokenResponse?.token || user.youtube.access_token,
      refresh_token: user.youtube.access_token,
    });

    const youtube = google.youtube({ version: "v3", auth: oauth2Client });
    const { data }: { data: youtube_v3.Schema$VideoListResponse } =
      await youtube.videos.list({
        part: ["statistics"],
        id: [videoId],
      });

    const stats = data.items && data.items[0]?.statistics;
    if (!stats)
      return res
        .status(404)
        .json({ success: false, message: "Video not found" });

    return res.status(200).json({ success: true, result: stats });
  } catch (error: any) {
    console.error("Error fetching video statistics:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch video statistics",
      error: error.message,
    });
  }
};

export const getChannelStatistics = async (req: Request, res: Response) => {
  try {
    const { user_id } = req.query;
    if (!user_id)
      return res
        .status(400)
        .json({ success: false, message: "User id required" });

    const user = await UserModel.findById(user_id);
    if (!user)
      return res
        .status(401)
        .json({ success: false, message: "User not found" });
    if (!user.youtube || !user.youtube.access_token) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid YouTube token" });
    }

    oauth2Client.setCredentials({ refresh_token: user.youtube.access_token });
    const accessTokenResponse = await oauth2Client.getAccessToken();
    oauth2Client.setCredentials({
      access_token: accessTokenResponse?.token || user.youtube.access_token,
      refresh_token: user.youtube.access_token,
    });

    const youtube = google.youtube({ version: "v3", auth: oauth2Client });
    const { data }: { data: youtube_v3.Schema$ChannelListResponse } =
      await youtube.channels.list({
        part: ["statistics"],
        mine: true,
      });

    const stats = data.items && data.items[0]?.statistics;
    if (!stats)
      return res
        .status(404)
        .json({ success: false, message: "Channel not found" });

    return res.status(200).json({ success: true, result: stats });
  } catch (error: any) {
    console.error("Error fetching channel statistics:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch channel statistics",
      error: error.message,
    });
  }
};

export const getYoutubeAllDetails = async (req: Request, res: Response) => {
  try {
    const { user_id } = req.query;

    if (!user_id) {
      return res
        .status(400)
        .json({ success: false, message: "User id required" });
    }

    const user = await UserModel.findById(user_id);
    if (!user || !user.youtube?.access_token) {
      return res
        .status(401)
        .json({ success: false, message: "User or YouTube token not found" });
    }

    const { youtube, analytics } = await getAuthorizedClient(
      user.youtube.access_token,
    );

    // 1. Get channel info
    const channelResp = await youtube.channels.list({
      part: ["snippet", "statistics", "contentDetails", "brandingSettings"],
      mine: true,
    });

    if (!channelResp.data.items?.length) {
      return res
        .status(404)
        .json({ success: false, message: "No channel found" });
    }

    const channelData = channelResp.data.items[0];
    const channelId = channelData.id!;
    const uploadsPlaylistId =
      channelData.contentDetails?.relatedPlaylists?.uploads;

    // 2. Dates for Analytics (configurable via ?days=)
    const endDate = new Date().toISOString().split("T")[0];
    const daysParam = Number((req.query as any).days) || 30;
    const safeDays =
      Number.isFinite(daysParam) && daysParam > 0 ? daysParam : 30;
    const startDate = new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    // Additional fixed windows for dashboard use-cases
    const todayStr = new Date().toISOString().split("T")[0];
    const last48hStartStr = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
    const last28dStartStr = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    // 3. Parallel fetching of various data points
    const [
      videosResp,
      subscriptionsResp,
      activitiesResp,
      playlistsResp,
      commentsResp,
      analyticsReport,
      growthReport,
      ageReport,
      genderReport,
      overviewReport,
      trafficSourceReport,
      deviceTypeReport,
      topVideosReport,
      productReport,
      osReport,
      subscribedStatusReport,
      searchTermsReport,
      externalSitesReport,
      reachDailyReport,
      provincesUSReport,
      provincesCAReport,
      revenueOverviewReport,
      revenueByDayReport,
      revenueByCountryReport,
      revenueTopVideosReport,
      retentionDailyReport,
      // Dashboard additions (supported identifiers only)
      topContent48hReport,
      overview28dReport,
      topContent28dReport,
      subscribedStatus28dReport,
      trafficSources28dReport,
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
        maxResults: 50, // More for classification
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
      analytics.reports
        .query({
          ids: `channel==${channelId}`,
          startDate,
          endDate,
          metrics: "views,estimatedMinutesWatched,averageViewDuration",
          dimensions: "country",
          sort: "-views",
          maxResults: 5,
        })
        .catch((e) => {
          console.error("Analytics Error (Locations):", e.message);
          return null;
        }),
      analytics.reports
        .query({
          ids: `channel==${channelId}`,
          startDate,
          endDate,
          metrics: "views,subscribersGained",
          dimensions: "day",
          sort: "day",
        })
        .catch((e) => {
          console.error("Analytics Error (Growth):", e.message);
          return null;
        }),
      analytics.reports
        .query({
          ids: `channel==${channelId}`,
          startDate,
          endDate,
          metrics: "viewerPercentage",
          dimensions: "ageGroup",
          sort: "ageGroup",
        })
        .catch((e) => {
          console.error("Analytics Error (Age):", e.message);
          return null;
        }),
      analytics.reports
        .query({
          ids: `channel==${channelId}`,
          startDate,
          endDate,
          metrics: "viewerPercentage",
          dimensions: "gender",
          sort: "gender",
        })
        .catch((e) => {
          console.error("Analytics Error (Gender):", e.message);
          return null;
        }),
      // Overview totals similar to Studio summary
      analytics.reports
        .query({
          ids: `channel==${channelId}`,
          startDate,
          endDate,
          metrics:
            "views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,subscribersGained,subscribersLost",
        })
        .catch((e) => {
          console.error("Analytics Error (Overview):", e.message);
          return null;
        }),
      // Traffic sources breakdown
      analytics.reports
        .query({
          ids: `channel==${channelId}`,
          startDate,
          endDate,
          metrics: "views,estimatedMinutesWatched",
          dimensions: "insightTrafficSourceType",
          sort: "-views",
        })
        .catch((e) => {
          console.error("Analytics Error (Traffic Sources):", e.message);
          return null;
        }),
      // Device type breakdown
      analytics.reports
        .query({
          ids: `channel==${channelId}`,
          startDate,
          endDate,
          metrics: "views,estimatedMinutesWatched",
          dimensions: "deviceType",
          sort: "-views",
        })
        .catch((e) => {
          console.error("Analytics Error (Device Types):", e.message);
          return null;
        }),
      // Top videos
      analytics.reports
        .query({
          ids: `channel==${channelId}`,
          startDate,
          endDate,
          metrics:
            "views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage",
          dimensions: "video",
          sort: "-views",
          maxResults: 10,
        })
        .catch((e) => {
          console.error("Analytics Error (Top Videos):", e.message);
          return null;
        }),
      // YouTube products (watch page, channel, embedded)
      analytics.reports
        .query({
          ids: `channel==${channelId}`,
          startDate,
          endDate,
          metrics: "views,estimatedMinutesWatched",
          dimensions: "insightPlaybackLocationType",
          sort: "-views",
        })
        .catch((e) => {
          console.error("Analytics Error (Products):", e.message);
          return null;
        }),
      // Operating systems
      analytics.reports
        .query({
          ids: `channel==${channelId}`,
          startDate,
          endDate,
          metrics: "views,estimatedMinutesWatched",
          dimensions: "operatingSystem",
          sort: "-views",
        })
        .catch((e) => {
          console.error("Analytics Error (OS):", e.message);
          return null;
        }),
      // Subscribed vs unsubscribed viewers
      analytics.reports
        .query({
          ids: `channel==${channelId}`,
          startDate,
          endDate,
          metrics: "views,estimatedMinutesWatched",
          dimensions: "subscribedStatus",
          sort: "-views",
        })
        .catch((e) => {
          console.error("Analytics Error (Subscribed Status):", e.message);
          return null;
        }),
      // Top search terms (trafficSourceDetail requires filter for YT_SEARCH)
      analytics.reports
        .query({
          ids: `channel==${channelId}`,
          startDate,
          endDate,
          metrics: "views,estimatedMinutesWatched",
          dimensions: "insightTrafficSourceDetail",
          filters: "insightTrafficSourceType==YT_SEARCH",
          sort: "-views",
          maxResults: 15,
        })
        .catch((e) => {
          console.error("Analytics Error (Search Terms):", e.message);
          return null;
        }),
      // Top external sites (trafficSourceDetail for EXT_URL)
      analytics.reports
        .query({
          ids: `channel==${channelId}`,
          startDate,
          endDate,
          metrics: "views,estimatedMinutesWatched",
          dimensions: "insightTrafficSourceDetail",
          filters: "insightTrafficSourceType==EXT_URL",
          sort: "-views",
          maxResults: 15,
        })
        .catch((e) => {
          console.error("Analytics Error (External Sites):", e.message);
          return null;
        }),
      // Reach: daily impressions & CTR
      analytics.reports
        .query({
          ids: `channel==${channelId}`,
          startDate,
          endDate,
          metrics: "views,estimatedMinutesWatched",
          dimensions: "day",
          sort: "day",
        })
        .catch((e) => {
          console.error("Analytics Error (Reach Daily):", e.message);
          return null;
        }),
      // Geography: provinces (US)
      analytics.reports
        .query({
          ids: `channel==${channelId}`,
          startDate,
          endDate,
          metrics: "views,estimatedMinutesWatched,averageViewDuration",
          dimensions: "province",
          filters: "country==US",
          sort: "-views",
          maxResults: 10,
        })
        .catch((e) => {
          console.error("Analytics Error (Provinces US):", e.message);
          return null;
        }),
      // Geography: provinces (CA)
      Promise.resolve({ data: { rows: [] } } as any),
      // Revenue overview
      Promise.resolve({ data: { rows: [] } } as any),
      // Revenue by day
      Promise.resolve({ data: { rows: [] } } as any),
      // Revenue by country
      Promise.resolve({ data: { rows: [] } } as any),
      // Revenue top videos
      Promise.resolve({ data: { rows: [] } } as any),
      // Retention daily (proxies)
      analytics.reports
        .query({
          ids: `channel==${channelId}`,
          startDate,
          endDate,
          metrics: "averageViewDuration,averageViewPercentage,views",
          dimensions: "day",
          sort: "day",
        })
        .catch((e) => {
          console.error("Analytics Error (Retention Daily):", e.message);
          return null;
        }),
      // Top content in last 48 hours (dimensions: video; metrics: views, estimatedMinutesWatched)
      analytics.reports
        .query({
          ids: `channel==${channelId}`,
          startDate: last48hStartStr,
          endDate: todayStr,
          metrics: "views,estimatedMinutesWatched",
          dimensions: "video",
          sort: "-views",
          maxResults: 10,
        })
        .catch((e) => {
          console.error("Analytics Error (Top Content 48h):", e.message);
          return null;
        }),
      // Overview (28 days) totals
      analytics.reports
        .query({
          ids: `channel==${channelId}`,
          startDate: last28dStartStr,
          endDate: todayStr,
          metrics:
            "views,estimatedMinutesWatched,subscribersGained,subscribersLost",
        })
        .catch((e) => {
          console.error("Analytics Error (Overview 28d):", e.message);
          return null;
        }),
      // Top content (28 days)
      analytics.reports
        .query({
          ids: `channel==${channelId}`,
          startDate: last28dStartStr,
          endDate: todayStr,
          metrics: "views,estimatedMinutesWatched",
          dimensions: "video",
          sort: "-views",
          maxResults: 10,
        })
        .catch((e) => {
          console.error("Analytics Error (Top Content 28d):", e.message);
          return null;
        }),
      // Viewer type breakdown (approx): SUBSCRIBED vs NOT_SUBSCRIBED over 28 days
      analytics.reports
        .query({
          ids: `channel==${channelId}`,
          startDate: last28dStartStr,
          endDate: todayStr,
          metrics: "views,estimatedMinutesWatched",
          dimensions: "subscribedStatus",
          sort: "-views",
        })
        .catch((e) => {
          console.error("Analytics Error (Subscribed Status 28d):", e.message);
          return null;
        }),
      // Traffic sources (28 days) - percentages computed in backend
      analytics.reports
        .query({
          ids: `channel==${channelId}`,
          startDate: last28dStartStr,
          endDate: todayStr,
          metrics: "views",
          dimensions: "insightTrafficSourceType",
          sort: "-views",
        })
        .catch((e) => {
          console.error("Analytics Error (Traffic Sources 28d):", e.message);
          return null;
        }),
    ]);

    // Fetch ALL uploads via pagination for accurate counts
    const allUploadItems: any[] = [...((videosResp.data.items as any[]) || [])];
    if (uploadsPlaylistId) {
      let nextPageToken: string | undefined = (videosResp.data as any)
        ?.nextPageToken;
      while (nextPageToken) {
        const resp = await youtube.playlistItems.list({
          part: ["snippet", "contentDetails"],
          playlistId: uploadsPlaylistId,
          maxResults: 50,
          pageToken: nextPageToken,
        });
        allUploadItems.push(...((resp.data.items as any[]) || []));
        nextPageToken = (resp.data as any)?.nextPageToken || undefined;
      }
    }

    // 4. Video Stats Classification
    const videoIds = (allUploadItems || [])
      .map((v) => v.contentDetails?.videoId)
      .filter((id): id is string => !!id);
    let videoStatsMap: Record<string, any> = {};
    if (videoIds.length > 0) {
      const statsResp = await youtube.videos.list({
        part: ["snippet", "statistics", "contentDetails", "status"],
        id: videoIds,
      });
      statsResp.data.items?.forEach((v) => {
        if (v.id) videoStatsMap[v.id] = v;
      });
    }

    // Fetch extra metadata for Top Videos from analytics
    const topVideoIds: string[] = ((topVideosReport?.data as any)?.rows || [])
      .map((row: any[]) => row?.[0])
      .filter((id: any): id is string => typeof id === "string" && !!id);

    let topVideoStatsMap: Record<string, any> = {};
    if (topVideoIds.length > 0) {
      const topVideoStatsResp = await youtube.videos.list({
        part: ["snippet", "statistics", "contentDetails", "status"],
        id: topVideoIds,
      });
      topVideoStatsResp.data.items?.forEach((v) => {
        if (v.id) topVideoStatsMap[v.id] = v;
      });
    }

    // Classification counts: derive Shorts vs Videos using duration from videoStatsMap
    let shortsCount = 0;
    let videosCount = 0;
    let liveCount = 0;

    // Keep live count from activities
    (activitiesResp.data.items || []).forEach((act: any) => {
      if (act.snippet?.type === "liveStream") liveCount++;
    });

    const isoToSeconds = (iso?: string): number => {
      if (!iso || typeof iso !== "string") return 0;
      const m = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
      if (!m) return 0;
      const h = Number(m[1] || 0);
      const min = Number(m[2] || 0);
      const s = Number(m[3] || 0);
      return h * 3600 + min * 60 + s;
    };

    Object.values(videoStatsMap).forEach((v: any) => {
      const sec = isoToSeconds(v?.contentDetails?.duration);
      if (sec > 0) {
        if (sec < 60) shortsCount++;
        else videosCount++;
      }
    });

    // Build Post Schedule from videos that have a future status.publishAt
    const postSchedule = Object.values(videoStatsMap)
      .filter((v: any) => {
        const publishAt = v.status?.publishAt;
        return publishAt && new Date(publishAt).getTime() > Date.now();
      })
      .map((v: any) => ({
        id: v.id,
        title: v.snippet?.title,
        scheduledAt: v.status?.publishAt,
        privacyStatus: v.status?.privacyStatus,
        thumbnails: v.snippet?.thumbnails,
      }))
      .sort(
        (a: any, b: any) =>
          new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
      );

    const result = {
      channel: {
        id: channelId,
        title: channelData.snippet?.title,
        handle: channelData.snippet?.customUrl,
        description: channelData.snippet?.description,
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
        const vId = item.contentDetails?.videoId;
        const stats = videoStatsMap[vId] || {};
        return {
          id: vId,
          title: item.snippet?.title,
          publishedAt:
            item.contentDetails?.videoPublishedAt || item.snippet?.publishedAt,
          thumbnails: item.snippet?.thumbnails,
          statistics: stats.statistics,
          duration: stats.contentDetails?.duration,
          privacyStatus: stats.status?.privacyStatus,
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
        products:
          (productReport?.data as any)?.rows?.map((row: any[]) => ({
            product: row[0],
            views: Number(row[1] || 0),
            watchTimeMinutes: Number(row[2] || 0),
            impressions: 0,
            impressionsCtr: 0,
          })) || [],
        operatingSystems:
          (osReport?.data as any)?.rows?.map((row: any[]) => ({
            os: row[0],
            views: Number(row[1] || 0),
            watchTimeMinutes: Number(row[2] || 0),
          })) || [],
        subscribedStatus:
          (subscribedStatusReport?.data as any)?.rows?.map((row: any[]) => ({
            status: row[0],
            views: Number(row[1] || 0),
            watchTimeMinutes: Number(row[2] || 0),
          })) || [],
        topSearchTerms:
          (searchTermsReport?.data as any)?.rows?.map((row: any[]) => ({
            term: row[0],
            views: Number(row[1] || 0),
            watchTimeMinutes: Number(row[2] || 0),
          })) || [],
        topExternalSites:
          (externalSitesReport?.data as any)?.rows?.map((row: any[]) => ({
            site: row[0],
            views: Number(row[1] || 0),
            watchTimeMinutes: Number(row[2] || 0),
          })) || [],
        // New sections
        reach: {
          overview: (() => {
            const rows = (overviewReport?.data as any)?.rows || [];
            const totals = rows[0] || [];
            const [views] = totals;
            return {
              impressions: 0,
              impressionsCtr: 0,
              views: Number(views || 0),
            };
          })(),
          daily:
            (reachDailyReport?.data as any)?.rows?.map((row: any[]) => ({
              date: row[0],
              impressions: 0,
              impressionsCtr: 0,
              views: Number(row[1] || 0),
            })) || [],
          bySource:
            (trafficSourceReport?.data as any)?.rows?.map((row: any[]) => ({
              source: row[0],
              impressions: 0,
              impressionsCtr: 0,
              views: Number(row[1] || 0),
            })) || [],
        },
        audience: {
          ageRange:
            (ageReport?.data as any)?.rows?.map((row: any[]) => ({
              ageGroup: row[0],
              views: Number(row[1] || 0),
            })) || [],
          gender:
            (genderReport?.data as any)?.rows?.map((row: any[]) => ({
              gender: row[0],
              views: Number(row[1] || 0),
            })) || [],
          subscribedStatus:
            (subscribedStatusReport?.data as any)?.rows?.map((row: any[]) => ({
              status: row[0],
              views: Number(row[1] || 0),
              watchTimeMinutes: Number(row[2] || 0),
            })) || [],
          devices:
            (deviceTypeReport?.data as any)?.rows?.map((row: any[]) => ({
              deviceType: row[0],
              views: Number(row[1] || 0),
              watchTimeMinutes: Number(row[2] || 0),
            })) || [],
          operatingSystems:
            (osReport?.data as any)?.rows?.map((row: any[]) => ({
              os: row[0],
              views: Number(row[1] || 0),
              watchTimeMinutes: Number(row[2] || 0),
            })) || [],
        },
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
        retention: {
          averages: (() => {
            const rows = (overviewReport?.data as any)?.rows || [];
            const totals = rows[0] || [];
            const [, , avgViewDuration, avgViewPercentage] = totals;
            return {
              averageViewDuration: Number(avgViewDuration || 0),
              averageViewPercentage: Number(avgViewPercentage || 0),
            };
          })(),
          daily:
            (retentionDailyReport?.data as any)?.rows?.map((row: any[]) => ({
              date: row[0],
              averageViewDuration: Number(row[1] || 0),
              averageViewPercentage: Number(row[2] || 0),
              views: Number(row[3] || 0),
            })) || [],
          topVideos:
            (topVideosReport?.data as any)?.rows?.map((row: any[]) => ({
              videoId: row[0],
              averageViewDuration: Number(row[3] || 0),
              averageViewPercentage: Number(row[4] || 0),
            })) || [],
        },
        revenue: {
          overview: (() => {
            const rows = (revenueOverviewReport?.data as any)?.rows || [];
            const totals = rows[0] || [];
            const [estimatedRevenue, adImpressions, monetizedPlaybacks, cpm] =
              totals;
            return {
              estimatedRevenue: Number(estimatedRevenue || 0),
              adImpressions: Number(adImpressions || 0),
              monetizedPlaybacks: Number(monetizedPlaybacks || 0),
              playbackBasedCpm: Number(cpm || 0),
            };
          })(),
          byDay:
            (revenueByDayReport?.data as any)?.rows?.map((row: any[]) => ({
              date: row[0],
              estimatedRevenue: Number(row[1] || 0),
              adImpressions: Number(row[2] || 0),
              monetizedPlaybacks: Number(row[3] || 0),
              playbackBasedCpm: Number(row[4] || 0),
            })) || [],
          byCountry:
            (revenueByCountryReport?.data as any)?.rows?.map((row: any[]) => ({
              country: row[0],
              estimatedRevenue: Number(row[1] || 0),
            })) || [],
          topVideos:
            (revenueTopVideosReport?.data as any)?.rows?.map((row: any[]) => ({
              videoId: row[0],
              estimatedRevenue: Number(row[1] || 0),
              monetizedPlaybacks: Number(row[2] || 0),
            })) || [],
        },
      },
    };

    // Build Dashboard sections (frontend-friendly)
    // Note: We only use supported metrics/dimensions; impressions/CTR are unavailable.
    // 1) Top Content (Last 48 Hours)
    const top48Ids = ((topContent48hReport?.data as any)?.rows || [])
      .map((r: any[]) => r[0])
      .filter((id: any): id is string => typeof id === "string" && !!id);
    let top48MetaMap: Record<string, any> = {};
    if (top48Ids.length > 0) {
      const resp = await youtube.videos.list({
        part: ["snippet", "contentDetails"],
        id: top48Ids,
      });
      resp.data.items?.forEach((v) => {
        if (v.id) top48MetaMap[v.id] = v;
      });
    }
    const topContent48h = ((topContent48hReport?.data as any)?.rows || []).map(
      (row: any[]) => {
        const videoId = row[0];
        const meta = top48MetaMap[videoId] || {};
        return {
          videoId,
          views: Number(row[1] || 0),
          watchTimeMinutes: Number(row[2] || 0),
          // Enriched via Data API
          title: meta.snippet?.title,
          thumbnails: meta.snippet?.thumbnails,
          duration: meta.contentDetails?.duration,
        };
      },
    );

    // 2) Overview Tab (Last 28 Days)
    const overview28Rows = (overview28dReport?.data as any)?.rows || [];
    const [ovViews, ovMinutes, ovSubsG, ovSubsL] = overview28Rows[0] || [];
    const top28Ids = ((topContent28dReport?.data as any)?.rows || [])
      .map((r: any[]) => r[0])
      .filter((id: any): id is string => typeof id === "string" && !!id);
    let top28MetaMap: Record<string, any> = {};
    if (top28Ids.length > 0) {
      const resp = await youtube.videos.list({
        part: ["snippet", "contentDetails"],
        id: top28Ids,
      });
      resp.data.items?.forEach((v) => {
        if (v.id) top28MetaMap[v.id] = v;
      });
    }
    const topContent28d = ((topContent28dReport?.data as any)?.rows || []).map(
      (row: any[]) => {
        const videoId = row[0];
        const meta = top28MetaMap[videoId] || {};
        return {
          videoId,
          views: Number(row[1] || 0),
          watchTimeMinutes: Number(row[2] || 0),
          title: meta.snippet?.title,
          thumbnails: meta.snippet?.thumbnails,
          duration: meta.contentDetails?.duration,
        };
      },
    );

    // 3) Content Tab (published content + viewer type breakdown)
    const last28dStart = new Date(last28dStartStr).getTime();
    const contentPublished = (allUploadItems || [])
      .filter((item: any) => {
        const publishedAt =
          item.contentDetails?.videoPublishedAt || item.snippet?.publishedAt;
        return publishedAt && new Date(publishedAt).getTime() >= last28dStart;
      })
      .map((item: any) => {
        const vId = item.contentDetails?.videoId;
        const stats = (videoStatsMap as any)[vId] || {};
        return {
          id: vId,
          title: item.snippet?.title,
          thumbnails: item.snippet?.thumbnails,
          publishedAt:
            item.contentDetails?.videoPublishedAt || item.snippet?.publishedAt,
          duration: stats.contentDetails?.duration,
          views: Number(stats.statistics?.viewCount || 0),
        };
      });
    const viewerRows = (subscribedStatus28dReport?.data as any)?.rows || [];
    const viewerBreakdown = {
      // Approximation: NOT_SUBSCRIBED as new viewers; SUBSCRIBED as regular viewers
      approximationUsed: true,
      newViewersApprox: {
        views: Number(
          (viewerRows.find((r: any[]) => r[0] === "NOT_SUBSCRIBED") || [])[1] ||
            0,
        ),
        watchTimeMinutes: Number(
          (viewerRows.find((r: any[]) => r[0] === "NOT_SUBSCRIBED") || [])[2] ||
            0,
        ),
      },
      regularViewersApprox: {
        views: Number(
          (viewerRows.find((r: any[]) => r[0] === "SUBSCRIBED") || [])[1] || 0,
        ),
        watchTimeMinutes: Number(
          (viewerRows.find((r: any[]) => r[0] === "SUBSCRIBED") || [])[2] || 0,
        ),
      },
    };

    // 4) Content Performance (Impressions Flow)
    const impressionsFlow = {
      // The YouTube Analytics API v2 does NOT provide impressions or CTR.
      impressionsUnavailable: true,
      impressions: 0,
      ctr: 0,
      watchTimeFromImpressions: 0,
    };

    // 5) Traffic Sources (percentages) - supported identifiers only
    const allowedSources = new Set([
      "YT_SEARCH",
      "BROWSE_FEATURES",
      "SUGGESTED_VIDEO",
      "CHANNEL_PAGES",
      "DIRECT_OR_UNKNOWN",
    ]);
    const tsRows = (trafficSources28dReport?.data as any)?.rows || [];
    const filteredTS = tsRows.filter((r: any[]) => allowedSources.has(r[0]));
    const totalTSViews = filteredTS.reduce(
      (sum: number, r: any[]) => sum + Number(r[1] || 0),
      0,
    );
    const trafficSources = filteredTS.map((r: any[]) => ({
      source: r[0],
      views: Number(r[1] || 0),
      percentage:
        totalTSViews > 0 ? (Number(r[1] || 0) / totalTSViews) * 100 : 0,
    }));

    // 6) Audience Tab (28 days proxy)
    const audienceWatchRows = viewerRows;
    const minutesSubscribed = Number(
      (audienceWatchRows.find((r: any[]) => r[0] === "SUBSCRIBED") || [])[2] ||
        0,
    );
    const minutesNotSubscribed = Number(
      (audienceWatchRows.find((r: any[]) => r[0] === "NOT_SUBSCRIBED") ||
        [])[2] || 0,
    );
    const totalMinutes = minutesSubscribed + minutesNotSubscribed;
    const audience = {
      views: Number(ovViews || 0),
      watchTimeHours: Number(ovMinutes || 0) / 60,
      subscribersNet: Number((ovSubsG || 0) - (ovSubsL || 0)),
      watchTimeSplit: {
        subscribedPercent:
          totalMinutes > 0 ? (minutesSubscribed / totalMinutes) * 100 : 0,
        notSubscribedPercent:
          totalMinutes > 0 ? (minutesNotSubscribed / totalMinutes) * 100 : 0,
      },
    };

    // Attach dashboard to result without altering existing structure
    (result as any).dashboard = {
      topContent48h,
      overview28d: {
        totalViews: Number(ovViews || 0),
        totalWatchTimeHours: Number(ovMinutes || 0) / 60,
        subscribersGained: Number(ovSubsG || 0),
        subscribersLost: Number(ovSubsL || 0),
        netSubscribers: Number((ovSubsG || 0) - (ovSubsL || 0)),
        topContent: topContent28d,
      },
      contentTab: {
        views: Number(ovViews || 0),
        publishedContent: contentPublished,
        viewerBreakdown,
      },
      contentPerformance: impressionsFlow,
      trafficSources,
      audience,
    };

    return res.status(200).json({ success: true, result });
  } catch (error: any) {
    console.error("Error fetching all youtube details:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch all youtube details",
      error: error.message,
    });
  }
};

export const deleteYoutubeVideo = async (req: Request, res: Response) => {
  try {
    const { user_id, videoId } = req.body;

    if (!user_id || !videoId) {
      return res
        .status(400)
        .json({ success: false, message: "user_id and videoId required" });
    }

    const user = await UserModel.findById(user_id);
    if (!user || !user.youtube?.access_token) {
      return res
        .status(401)
        .json({ success: false, message: "User or YouTube token not found" });
    }

    const { youtube } = await getAuthorizedClient(user.youtube.access_token);

    await youtube.videos.delete({ id: videoId });

    return res
      .status(200)
      .json({ success: true, message: "Video deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting video:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete video",
      error: error.message,
    });
  }
};
