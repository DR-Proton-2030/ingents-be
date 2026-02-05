import { Request, Response } from "express";
import { google, youtube_v3 } from "googleapis";
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
  if (!user_id || user_id === "undefined" || !/^[a-fA-F0-9]{24}$/.test(user_id)) {
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
    const { user_id, title, description, tags, privacyStatus, videoURL } =
      req.body;
    const { iso: publishAtISO, error: scheduleError } = resolveYouTubePublishAt(
      req.body,
    );

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: "User id required",
      });
    }
    if (!videoURL) {
      return res.status(400).json({
        success: false,
        message: "No video URL provided",
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

    const response = await axios.get(videoURL, { responseType: "stream" });

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
          tags: tags || [],
        },
        status,
      },
      media: {
        body: response.data,
      },
    });

    const videoId = uploadResponse.data.id;

    if (publishAtISO) {
      // Save scheduled video to database
      await ScheduledPostModel.create({
        user_id,
        platform: "youtube",
        content: title || "Untitled Video",
        media_urls: [videoURL],
        media_type: "video",
        scheduled_at: new Date(publishAtISO),
        status: "completed",
        platform_specific_data: {
          description,
          tags,
          videoId,
          privacyStatus: status.privacyStatus,
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
        },
        message: "Video scheduled for publishing",
      });
    }

    // Save posted video to database
    await PostedContentModel.create({
      user_id,
      platform: "youtube",
      content: title || "Untitled Video",
      media_urls: [videoURL],
      posted_at: new Date(),
      platform_post_id: videoId,
      is_scheduled: false,
      status: "published",
      platform_specific_data: {
        description,
        tags,
        privacyStatus: privacyStatus || "public",
        videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Video uploaded successfully",
      videoId,
      videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
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
        });
      }

      pageToken = data.nextPageToken || undefined;
    } while (pageToken);

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

    // 2. Dates for Analytics (Last 30 days)
    const endDate = new Date().toISOString().split("T")[0];
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
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
          metrics: "views",
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
          metrics: "views",
          dimensions: "gender",
          sort: "gender",
        })
        .catch((e) => {
          console.error("Analytics Error (Gender):", e.message);
          return null;
        }),
    ]);

    // 4. Video Stats Classification
    const videoIds = (videosResp.data.items || [])
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

    // Classification counts from activities
    let shortsCount = 0;
    let videosCount = 0;
    let liveCount = 0;

    (activitiesResp.data.items || []).forEach((act: any) => {
      if (act.snippet?.type === "upload") videosCount++;
      if (act.snippet?.type === "liveStream") liveCount++;
      // Simplified: Duration < 60s is Short. We can check actual counts from stats mapping if we had more.
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
        shorts: shortsCount, // Note: Accurate count would need more API logic
        videos: parseInt(channelData.statistics?.videoCount || "0"),
        lives: liveCount,
        growthTrend:
          (growthReport?.data as any)?.rows?.map((row: any[]) => ({
            date: row[0],
            views: row[1],
            subscribersGained: row[2],
          })) || [],
      },
      recentVideos: (videosResp.data.items || []).map((item: any) => {
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
