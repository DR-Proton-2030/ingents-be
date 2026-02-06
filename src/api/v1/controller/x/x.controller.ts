import axios from "axios";
import { Request, Response } from "express";
import { Types } from "mongoose";
import {
  getXAuthURL,
  exchangeCodeForTokens,
  refreshXToken,
  getXUserProfile,
} from "../../../../services/x/x.service";
import UserModel from "../../../../models/users/users.model";
import PostedContentModel from "../../../../models/postedContent/postedContent.model";
import { uploadFileToS3Service } from "../../../../services/uploadFile/uploadFile";

const TWITTER_API_BASE = "https://api.twitter.com/2";
const TWITTER_OAUTH_REVOKE = "https://api.twitter.com/2/oauth2/revoke";

export const xLogin = async (req: Request, res: Response) => {
  try {
    const { user_id } = req.query as { user_id?: string };
    if (!user_id) {
      return res
        .status(400)
        .json({ success: false, message: "user_id is required" });
    }
    const url = await getXAuthURL(user_id);
    return res.redirect(url);
  } catch (error: any) {
    console.error("X login error:", error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      message: "X login failed",
      error: error.message,
    });
  }
};

export const xAuthCallback = async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query as { code?: string; state?: string };
    if (!code || !state) {
      return res
        .status(400)
        .json({ success: false, message: "Missing code or state" });
    }
    const userId = Buffer.from(state, "base64").toString("utf-8");
    const tokens = await exchangeCodeForTokens(code, userId);
    // Fetch profile (if possible) and update all fields at once
    // let profile: any | undefined;
    // try {
    //   profile = await getXUserProfile(tokens.access_token);
    //   console.log("X profile details ", profile);
    // } catch (profErr) {
    //   console.warn(
    //     "Failed to fetch X profile (will still store tokens):",
    //     profErr,
    //   );
    // }

    // const setFields: Record<string, any> = {
    //   "x.access_token": tokens.access_token,
    // };
    // if (tokens.refresh_token)
    //   setFields["x.refresh_token"] = tokens.refresh_token;
    // if (profile?.id) setFields["x.project_id"] = profile.id;
    // if (profile?.username || profile?.name)
    //   setFields["x.name"] = profile.username || profile.name;

    // try {
    //   await UserModel.findByIdAndUpdate(
    //     userId,
    //     { $set: setFields },
    //     { new: true },
    //   );
    // } catch (updateErr) {
    //   console.warn("Failed to store X data on callback:", updateErr);
    // }
    // const userParam = profile
    //   ? `&user=${encodeURIComponent(JSON.stringify(profile))}`
    //   : "";
    return res.redirect(
      `${process.env.FRONTEND_URL}/dashboard/social-media?platform=x&token=${tokens.access_token}&user_id=${userId}`,
    );
  } catch (error: any) {
    console.error("X callback error:", error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      message: "X OAuth callback failed",
      error: error.response?.data || error.message,
    });
  }
};

export const xRefreshToken = async (req: Request, res: Response) => {
  try {
    const { user_id } = req.query as { user_id?: string };
    if (!user_id) {
      return res
        .status(400)
        .json({ success: false, message: "user_id is required" });
    }
    const tokens = await refreshXToken(user_id);
    return res.status(200).json({ success: true, tokens });
  } catch (error: any) {
    console.error("X refresh error:", error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to refresh X token",
      error: error.response?.data || error.message,
    });
  }
};

export const getXProfile = async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization || "";
    const { user_id } = req.query as { user_id?: string };

    // Prefer stored user token when user_id is provided to ensure User Context
    let token: string | undefined = undefined;
    let refreshToken: string | undefined = undefined;
    if (user_id) {
      const user = await UserModel.findById(user_id);
      token = user?.x?.access_token || undefined;
      refreshToken = user?.x?.refresh_token || undefined;
    } else {
      token = authHeader.startsWith("Bearer ")
        ? authHeader.split("Bearer ")[1]
        : undefined;
    }

    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: "Missing X bearer token" });
    }

    try {
      const profile = await getXUserProfile(token);
      return res.status(200).json({ success: true, result: profile });
    } catch (err: any) {
      const status = err?.response?.status;
      const detail = err?.response?.data?.detail || err?.message;
      // If token is expired and we have a refresh, attempt refresh
      if (status === 401 && user_id && refreshToken) {
        try {
          const tokens = await refreshXToken(user_id);
          const profile = await getXUserProfile(tokens.access_token);
          return res.status(200).json({ success: true, result: profile });
        } catch (refreshErr: any) {
          return res.status(401).json({
            success: false,
            message: "Invalid or expired X token",
            error:
              refreshErr?.response?.data || refreshErr?.message || refreshErr,
          });
        }
      }
      // Unsupported auth typically means Application-Only token was used
      if (status === 403) {
        return res.status(403).json({
          success: false,
          message:
            "Unsupported authentication: use OAuth 2.0 User Context token",
          error: err?.response?.data || detail,
        });
      }
      return res.status(500).json({
        success: false,
        message: "Failed to fetch X profile",
        error: err?.response?.data || detail,
      });
    }
  } catch (error: any) {
    console.error(
      "X get profile error:",
      error.response?.data || error.message,
    );
    return res.status(500).json({
      success: false,
      message: "Failed to fetch X profile",
      error: error.response?.data || error.message,
    });
  }
};

// Universal X post: text, image (URL or file), or video (URL or file)
export const postXUniversal = async (req: Request, res: Response) => {
  try {
    const { userId, message, imageUrl, videoURL, hashtags } = req.body as {
      userId?: string;
      message?: string;
      imageUrl?: string;
      videoURL?: string;
      hashtags?: string | string[];
    };
    const uploadedImage = (req as any).files?.image?.[0];
    const uploadedVideo = (req as any).files?.video?.[0];

    if (!userId) {
      return res
        .status(400)
        .json({ success: false, message: "userId is required" });
    }

    // Get user's X access token
    const user = await UserModel.findById(userId);
    const accessToken = user?.x?.access_token;
    if (!accessToken) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - Missing X access token",
      });
    }

    // Prepare final media URLs if files uploaded (upload to S3), else use provided URLs
    let finalImageUrl: string | undefined = imageUrl;
    let finalVideoUrl: string | undefined = videoURL;
    if (uploadedImage) {
      const uploadedUrl = await uploadFileToS3Service(
        `x_uploads/${userId}`,
        uploadedImage.buffer,
        uploadedImage.mimetype || "image/jpeg",
      );
      finalImageUrl = uploadedUrl || undefined;
    }
    if (uploadedVideo) {
      const uploadedUrl = await uploadFileToS3Service(
        `x_uploads/${userId}`,
        uploadedVideo.buffer,
        uploadedVideo.mimetype || "video/mp4",
      );
      finalVideoUrl = uploadedUrl || undefined;
    }

    // Compose tweet text; media will be shared via URL in text (no media upload here)
    const parts: string[] = [];
    if (message) parts.push(message);
    if (finalImageUrl) parts.push(finalImageUrl);
    if (finalVideoUrl) parts.push(finalVideoUrl);
    // Append hashtags if provided
    try {
      let tags: string[] = [];
      if (Array.isArray(hashtags)) {
        tags = hashtags as string[];
      } else if (typeof hashtags === "string") {
        tags = (hashtags as string).split(/[\s,]+/);
      }
      const formatted = tags
        .map((t) => t.trim())
        .filter(Boolean)
        .map((t) => (t.startsWith("#") ? t.slice(1) : t))
        .map((t) => t.replace(/[^A-Za-z0-9_]/g, ""))
        .filter(Boolean)
        .map((t) => `#${t}`);
      if (formatted.length) parts.push(formatted.join(" "));
    } catch (_) {
      // ignore hashtag formatting errors
    }
    let text = parts.join(" \n").trim();
    // Optional: enforce tweet length to avoid API errors
    const MAX_TWEET_LENGTH = 280;
    if (text.length > MAX_TWEET_LENGTH) {
      text = text.slice(0, MAX_TWEET_LENGTH);
    }

    if (!text) {
      return res
        .status(400)
        .json({ success: false, message: "No valid content to post" });
    }

    const resp = await axios.post(
      `${TWITTER_API_BASE}/tweets`,
      { text },
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    // Save to history
    await PostedContentModel.create({
      user_id: new Types.ObjectId(userId),
      platform: "x",
      content: message || text,
      media_urls: [finalImageUrl, finalVideoUrl].filter(Boolean),
      media_type: finalVideoUrl ? "video" : finalImageUrl ? "image" : "text",
      posted_at: new Date(),
      platform_post_id: resp.data?.data?.id,
      is_scheduled: false,
      status: "published",
      hashtags: Array.isArray(hashtags) ? hashtags : (hashtags as string)?.split(/[\s,]+/).filter(Boolean) || [],
    });

    return res.status(200).json({
      success: true,
      tweetId: resp.data?.data?.id,
      message: "Tweet posted",
    });
  } catch (error: any) {
    console.error(
      "Universal X post error:",
      error.response?.data || error.message,
    );
    return res.status(500).json({
      success: false,
      message: "Failed to post on X",
      error: error.response?.data || error.message,
    });
  }
};

export const getXAllDetails = async (req: Request, res: Response) => {
  try {
    // Accept either Authorization header or infer from user_id
    const authHeader = req.headers.authorization || "";
    let bearerToken = authHeader.startsWith("Bearer ")
      ? authHeader.split("Bearer ")[1]
      : undefined;
    const { handle, user_id } = req.query as {
      handle?: string;
      user_id?: string;
    };

    // Try to resolve token and preferred identifiers from DB
    let preferredHandle: string | undefined = handle;
    let preferredUserId: string | undefined = undefined;
    if (user_id) {
      const userDoc = await UserModel.findById(user_id).exec();
      if (!userDoc) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }
      bearerToken = bearerToken || userDoc.x?.access_token || undefined;
      preferredHandle = preferredHandle || userDoc.x?.name || undefined;
      // "project_id" may store X user id in this app design
      preferredUserId = userDoc.x?.project_id || undefined;
    }

    if (!bearerToken) {
      return res
        .status(401)
        .json({ success: false, message: "Missing X bearer token" });
    }

    const headers = { Authorization: `Bearer ${bearerToken}` };

    // 1) Resolve X user by id or handle or fallback to /users/me
    let xUser: any | undefined;
    if (preferredUserId) {
      const byIdResp = await axios
        .get(
          `${TWITTER_API_BASE}/users/${encodeURIComponent(preferredUserId)}?user.fields=profile_image_url,public_metrics,description,location,created_at,url,verified`,
          { headers },
        )
        .catch(() => undefined);
      xUser = byIdResp?.data?.data;
    }
    if (!xUser && preferredHandle) {
      const byHandleResp = await axios
        .get(
          `${TWITTER_API_BASE}/users/by/username/${encodeURIComponent(preferredHandle)}?user.fields=profile_image_url,public_metrics,description,location,created_at,url,verified`,
          { headers },
        )
        .catch(() => undefined);
      xUser = byHandleResp?.data?.data;
    }
    if (!xUser) {
      // last resort: use authenticated user
      try {
        xUser = await getXUserProfile(bearerToken);
      } catch (_) {
        // ignore
      }
    }
    if (!xUser?.id) {
      return res
        .status(404)
        .json({ success: false, message: "X user not found" });
    }

    // 2) Recent tweets with media expansions
    const tweetsResp = await axios
      .get(
        `${TWITTER_API_BASE}/users/${xUser.id}/tweets?max_results=20&tweet.fields=created_at,public_metrics,possibly_sensitive,referenced_tweets,entities,attachments&expansions=attachments.media_keys,author_id,referenced_tweets.id&media.fields=type,url,preview_image_url`,
        { headers },
      )
      .catch(() => ({ data: { data: [], includes: { media: [] } } }));

    const tweets = tweetsResp.data.data || [];
    const mediaIndex: Record<string, any> = {};
    const mediaItems = (tweetsResp.data.includes?.media || []) as any[];
    for (const m of mediaItems) {
      if (m.media_key) mediaIndex[m.media_key] = m;
    }

    // Classify posts by content type
    let photos = 0,
      videos = 0,
      links = 0,
      statuses = 0;
    const recentPosts = tweets.map((t: any) => {
      const hasLinks = !!(t.entities?.urls && t.entities.urls.length > 0);
      const mediaKeys = t.attachments?.media_keys || [];
      let type = "status";
      if (mediaKeys.length > 0) {
        const first = mediaIndex[mediaKeys[0]];
        if (first?.type === "video") type = "video";
        else type = "photo";
      } else if (hasLinks) {
        type = "link";
      }
      if (type === "photo") photos++;
      else if (type === "video") videos++;
      else if (type === "link") links++;
      else statuses++;

      return {
        id: t.id,
        message: t.text,
        created_time: t.created_at,
        permalink_url: `https://x.com/${preferredHandle || xUser.username || xUser.name || "user"}/status/${t.id}`,
        full_picture:
          mediaKeys.length > 0 && mediaIndex[mediaKeys[0]]?.url
            ? mediaIndex[mediaKeys[0]].url
            : undefined,
        type,
        shares: t.public_metrics?.retweet_count || 0,
        commentsCount: t.public_metrics?.reply_count || 0,
        likes: t.public_metrics?.like_count || 0,
      };
    });

    // Growth trend: simple daily tweet activity as a proxy
    const dayMap: Record<string, number> = {};
    for (const t of tweets) {
      const date = (t.created_at || "").split("T")[0];
      if (!date) continue;
      dayMap[date] = (dayMap[date] || 0) + 1;
    }
    const growthTrend = Object.entries(dayMap)
      .map(([date, count]) => ({ date, views: count, postsMade: count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Recent comments are not directly available; keep empty
    const recentComments: any[] = [];

    // Post schedule not available via public API; keep empty
    const postSchedule: any[] = [];

    const result = {
      page: {
        id: xUser.id,
        title: xUser.name,
        handle: preferredHandle || xUser.username || undefined,
        description: xUser.description,
        link:
          preferredHandle || xUser.username
            ? `https://x.com/${preferredHandle || xUser.username}`
            : undefined,
        picture: xUser.profile_image_url,
        fan_count: xUser.public_metrics?.followers_count,
        cover: undefined,
        category: undefined,
        location: xUser.location,
        verified: xUser.verified,
      },
      demographics: {
        topLocations: [],
        ageRange: [],
        gender: [],
      },
      postActivity: {
        photos,
        videos,
        links,
        statuses,
        growthTrend,
      },
      recentPosts,
      recentComments,
      postSchedule,
    };

    return res.status(200).json({ success: true, result });
  } catch (error: any) {
    console.error(
      "Error fetching X all details:",
      error.response?.data || error.message,
    );
    return res.status(500).json({
      success: false,
      message: "Failed to fetch X details",
      error: error.response?.data || error.message,
    });
  }
};

export const disconnectX = async (req: Request, res: Response) => {
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

    const accessToken = user.x?.access_token || undefined;
    const refreshToken = user.x?.refresh_token || undefined;

    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      {
        $set: {
          "x.project_id": null,
          "x.name": null,
          "x.access_token": null,
          "x.refresh_token": null,
          "x.pkce_verifier": null,
        },
      },
      { new: true },
    ).exec();

    const clientId = process.env.X_CLIENT_ID;
    if (clientId) {
      const headers = { "Content-Type": "application/x-www-form-urlencoded" };
      // Try revoking refresh token first
      if (refreshToken) {
        try {
          await axios.post(
            TWITTER_OAUTH_REVOKE,
            new URLSearchParams({
              token: refreshToken,
              client_id: clientId,
              token_type_hint: "refresh_token",
            }),
            { headers },
          );
        } catch (revErr: any) {
          console.warn(
            "Failed to revoke X refresh token:",
            revErr?.response?.data || revErr?.message || revErr,
          );
        }
      }
      // Then attempt revoking access token
      if (accessToken) {
        try {
          await axios.post(
            TWITTER_OAUTH_REVOKE,
            new URLSearchParams({
              token: accessToken,
              client_id: clientId,
              token_type_hint: "access_token",
            }),
            { headers },
          );
        } catch (revErr: any) {
          console.warn(
            "Failed to revoke X access token:",
            revErr?.response?.data || revErr?.message || revErr,
          );
        }
      }
    } else {
      console.warn("X_CLIENT_ID missing; skipping token revocation.");
    }

    return res.status(200).json({
      success: true,
      message: "X disconnected successfully",
      user: updatedUser,
    });
  } catch (error: any) {
    console.error("Error disconnecting X:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to disconnect X",
      error: error.message,
    });
  }
};
