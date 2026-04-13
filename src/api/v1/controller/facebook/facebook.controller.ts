import { Request, Response } from "express";
import { Types } from "mongoose";
import {
  getFacebookAuthURL,
  getFacebookUser,
  getLongLivedToken,
  getPageTokenService,
  resolveScheduledPublishTime,
  validateScheduledPublishTime,
} from "../../../../services/facebook/facebook.service";
import axios from "axios";
import FormData from "form-data";
import { uploadFileToS3Service } from "../../../../services/uploadFile/uploadFile";
import UserModel from "../../../../models/users/users.model";
import PostedContentModel from "../../../../models/postedContent/postedContent.model";
const FACEBOOK_GRAPH_URL = "https://graph.facebook.com/v20.0";
import { buildFacebookDashboardBuilder } from "../../../../services/facebook/dashboard.builder";

export const facebookLogin = (req: Request, res: Response) => {
  const { user_id } = req.query;
  console.log("=====>userId", user_id);

  console.log("user_id", user_id);
  if (!user_id) return res.status(400).json({ error: "Client ID is required" });
  const authUrl = getFacebookAuthURL(user_id as string);
  res.redirect(authUrl);
};

export const facebookAuthCallback = async (req: Request, res: Response) => {
  try {
    const { code, state, granted_scopes, denied_scopes } = req.query;

    console.log("===>called state", state);
    console.log("Facebook callback code and state : ", code, state);
    if (granted_scopes || denied_scopes) {
      console.log("Facebook scopes (granted/denied):", {
        granted_scopes,
        denied_scopes,
      });
    }
    if (!code) return res.status(400).json({ error: "No code provided" });

    // Exchange code for access token & user data
    const { tokens, user } = await getFacebookUser(code as string);

    console.log("====>state : ", state);
    const rawState = String(state || "");
    const isObjectId = (v: string) => /^[a-fA-F0-9]{24}$/.test(v);

    // `state` is set to userId (not base64) in getFacebookAuthURL.
    // Accept both raw ObjectId and base64-encoded ObjectId for backward/forward compatibility.
    const decodedState = (() => {
      if (isObjectId(rawState)) return rawState;
      try {
        const d = atob(rawState);
        return isObjectId(d) ? d : null;
      } catch {
        return null;
      }
    })();

    if (!decodedState) {
      return res.status(400).json({
        error: "Invalid state parameter",
      });
    }

    const userId = decodedState;
    // Redirect to frontend with token & pages as query params
    res.redirect(
      `${process.env.FRONTEND_URL}/dashboard/social-media?platform=facebook&token=${
        tokens.access_token
      }&user=${encodeURIComponent(JSON.stringify(user))}&user_id=${userId}`,
    );
  } catch (error) {
    console.error("OAuth authentication failed:", error);
    res.status(500).json({ error: "OAuth authentication failed" });
  }
};

/**
 * Fetch Facebook Pages
 */
export const fetchFacebookPages = async (req: Request, res: Response) => {
  try {
    console.log("fetchFacebookPages called");
    const userAccessToken = req.headers.authorization?.split("Bearer ")[1];
    const rawUserId =
      (req.query.userId as string) ||
      (req.query.user_id as string) ||
      (req.query.user as string);
    console.log("===========>", rawUserId);
    if (!userAccessToken) {
      return res
        .status(401)
        .json({ error: "Unauthorized - Missing Facebook Token" });
    }
    if (!rawUserId) {
      return res.status(400).json({ error: "Missing userId in query" });
    }

    const isObjectId = (v: string) => /^[a-fA-F0-9]{24}$/.test(v);
    const userId = (() => {
      if (isObjectId(rawUserId)) return rawUserId;
      try {
        const d = atob(String(rawUserId));
        return isObjectId(d) ? d : null;
      } catch {
        return null;
      }
    })();

    if (!userId) {
      return res.status(400).json({
        error: "Invalid userId in query",
      });
    }

    console.log("===========>", userId);

    // Get long-lived token
    const longTokenResponse = await getLongLivedToken(userAccessToken);
    const longLivedToken = longTokenResponse?.access_token || longTokenResponse;

    //  Save token & fetch pages in parallel
    const [savedUser, pagesResponse] = await Promise.all([
      UserModel.findByIdAndUpdate(
        userId,
        { $set: { "facebook.access_token": longLivedToken } },
        { new: true },
      ),
      axios.get(`https://graph.facebook.com/v20.0/me/accounts`, {
        params: {
          fields: "id,name,access_token,category,tasks",
          limit: 200,
          access_token: longLivedToken,
        },
      }),
    ]);

    console.log("Saved user token : ", savedUser);

    const pages = pagesResponse.data?.data || [];
    const isProd = process.env.NODE_ENV === "production";

    // If pages are empty, include helpful debug context (non-production only)
    let debug: any = undefined;
    if (!isProd && Array.isArray(pages) && pages.length === 0) {
      try {
        const appAccessToken = `${process.env.FACEBOOK_CLIENT_ID}|${process.env.FACEBOOK_CLIENT_SECRET}`;
        const [debugTokenRes, permissionsRes] = await Promise.all([
          axios.get("https://graph.facebook.com/debug_token", {
            params: {
              input_token: longLivedToken,
              access_token: appAccessToken,
            },
          }),
          axios.get("https://graph.facebook.com/v20.0/me/permissions", {
            params: { access_token: longLivedToken },
          }),
        ]);

        debug = {
          debug_token: debugTokenRes.data,
          permissions: permissionsRes.data,
        };
      } catch (dbgErr: any) {
        debug = {
          error: dbgErr?.response?.data || dbgErr?.message || String(dbgErr),
        };
      }
    }

    return res.json({
      message: "Token saved and pages fetched successfully",
      user: savedUser,
      result: pages,
      ...(debug ? { debug } : {}),
    });
  } catch (error: any) {
    console.error(
      "Error saving token or fetching pages:",
      error.response?.data || error.message,
    );
    return res.status(500).json({
      error: "Failed to save token or fetch pages",
      details: error.response?.data || error.message,
    });
  }
};

// Get long Live Access Token
export const getAccessTokenLongTerm = async (req: Request, res: Response) => {
  try {
    const userPayload = req.body;
    const AccessToken = req.headers.authorization?.split("Bearer ")[1];
    if (!AccessToken) {
      return res
        .status(401)
        .json({ error: "Unauthorized - Missing Facebook Token" });
    }

    const response = await getLongLivedToken(AccessToken);

    if (req.query.user_id) {
      await UserModel.findByIdAndUpdate(
        { _id: req.query.user_id },
        { $set: userPayload },
        { new: true },
      );
    }

    console.log("Long Lived token response : ", response);

    res.status(200).json({
      success: true,
      message: "Successfully get access token",
      token: response,
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Internal server error!...",
    });
  }
};

// Universal Facebook post: text, image, or video
export const postFacebookUniversal = async (req: Request, res: Response) => {
  try {
    const { userId, pageId, message, imageUrl, videoURL } = req.body;
    const uploadedImage = (req as any).files?.image?.[0];
    const uploadedVideo = (req as any).files?.video?.[0];
    const scheduledPublishTime = resolveScheduledPublishTime(req.body);

    // Validate scheduled publish time early to avoid Graph API errors
    const scheduleValidationError =
      validateScheduledPublishTime(scheduledPublishTime);
    if (scheduleValidationError) {
      return res.status(400).json({
        success: false,
        message: scheduleValidationError,
      });
    }

    if (!userId || !pageId) {
      return res.status(400).json({ error: "userId and pageId are required" });
    }

    // Get page access token
    const { pageAccessToken, id } = await getPageTokenService(userId, pageId);

    // Priority: if message only, post text; if image present (file or url), post image; if video present, post video
    if (message && !uploadedImage && !uploadedVideo && !imageUrl && !videoURL) {
      // Text only (immediate or scheduled)
      const payload: any = {
        message,
        access_token: pageAccessToken,
      };
      if (scheduledPublishTime) {
        // Facebook scheduled post requires published=false
        payload.published = false;
        payload.scheduled_publish_time = scheduledPublishTime;
      }
      const postRes = await axios.post(
        `${FACEBOOK_GRAPH_URL}/${id}/feed`,
        payload,
      );

      // Save to history if not scheduled (scheduled posts are handled by the scheduler service)
      if (!scheduledPublishTime) {
        await PostedContentModel.create({
          user_id: userId,
          platform: "facebook",
          content: message,
          posted_at: new Date(),
          platform_post_id: postRes.data.id,
          is_scheduled: false,
          status: "published",
          page_id: pageId,
          media_type: "text",
        });
      }

      if (scheduledPublishTime) {
        // Fetch more details for the scheduled post
        const detailsRes = await axios.get(
          `${FACEBOOK_GRAPH_URL}/${postRes.data.id}?fields=id,message,scheduled_publish_time,permalink_url,created_time,is_published`,
          { headers: { Authorization: `Bearer ${pageAccessToken}` } },
        );
        const sp = detailsRes.data || {};
        const scheduledDetails = {
          id: sp.id || postRes.data.id,
          title: sp.message || message || "",
          scheduledAt: sp.scheduled_publish_time
            ? new Date(sp.scheduled_publish_time * 1000).toISOString()
            : new Date(scheduledPublishTime * 1000).toISOString(),
          permalink_url: sp.permalink_url,
          created_time: sp.created_time,
          is_published: Boolean(sp.is_published),
        };
        return res.status(200).json({
          success: true,
          scheduled: true,
          scheduled_publish_time: scheduledPublishTime,
          details: scheduledDetails,
          message: "Text scheduled",
        });
      }
      return res.status(200).json({
        success: true,
        postId: postRes.data.id,
        scheduled: Boolean(scheduledPublishTime),
        scheduled_publish_time: scheduledPublishTime || undefined,
        message: scheduledPublishTime ? "Text scheduled" : "Text posted",
      });
    }

    // If image file uploaded -> upload to S3, save to user, post via URL
    if (uploadedImage || imageUrl) {
      let finalImageUrl = imageUrl;
      if (uploadedImage) {
        finalImageUrl = await uploadFileToS3Service(
          `facebook_uploads/${userId}`,
          uploadedImage.buffer,
          uploadedImage.mimetype || "image/jpeg",
        );
        try {
          await UserModel.findByIdAndUpdate(userId, {
            $set: { "facebook.last_uploaded_image": finalImageUrl },
          });
        } catch (dbErr) {
          console.warn("Failed to save image URL:", dbErr);
        }
      }

      const imgPayload: any = {
        url: finalImageUrl,
        // 'caption' is not a valid field on Photo; use 'message' for the photo's caption
        message: message || "",
        access_token: pageAccessToken,
      };
      if (scheduledPublishTime) {
        imgPayload.published = false;
        imgPayload.scheduled_publish_time = scheduledPublishTime;
      }

      const imgRes = await axios.post(
        `${FACEBOOK_GRAPH_URL}/${id}/photos`,
        imgPayload,
      );

      // Save to history if not scheduled
      // Use post_id (pageId_postId format) from photos endpoint for correct metrics fetching
      if (!scheduledPublishTime) {
        await PostedContentModel.create({
          user_id: userId,
          platform: "facebook",
          content: message || "",
          media_urls: [finalImageUrl],
          media_type: "image",
          posted_at: new Date(),
          platform_post_id: imgRes.data.post_id || imgRes.data.id,
          is_scheduled: false,
          status: "published",
          page_id: pageId,
        });
      }

      if (scheduledPublishTime) {
        try {
          // Do not request 'scheduled_publish_time' on Photo node to avoid errors
          const detailsRes = await axios.get(
            `${FACEBOOK_GRAPH_URL}/${imgRes.data.id}?fields=id,name,permalink_url,full_picture,created_time,is_published`,
            { headers: { Authorization: `Bearer ${pageAccessToken}` } },
          );
          const sp = detailsRes.data || {};
          const scheduledDetails = {
            id: sp.id || imgRes.data.id,
            title: sp.name || message || "",
            scheduledAt: new Date(scheduledPublishTime * 1000).toISOString(),
            permalink_url: sp.permalink_url,
            full_picture: sp.full_picture,
            created_time: sp.created_time,
            is_published: Boolean(sp.is_published),
          };
          return res.status(200).json({
            success: true,
            scheduled: true,
            scheduled_publish_time: scheduledPublishTime,
            details: scheduledDetails,
            message: "Image scheduled",
          });
        } catch (_) {
          // Fallback if details fetch fails
          return res.status(200).json({
            success: true,
            scheduled: true,
            scheduled_publish_time: scheduledPublishTime,
            details: {
              id: imgRes.data.id,
              title: message || "",
              scheduledAt: new Date(scheduledPublishTime * 1000).toISOString(),
            },
            message: "Image scheduled",
          });
        }
      }
      return res.status(200).json({
        success: true,
        postId: imgRes.data.id,
        scheduled: Boolean(scheduledPublishTime),
        scheduled_publish_time: scheduledPublishTime || undefined,
        message: scheduledPublishTime ? "Image scheduled" : "Image posted",
      });
    }

    // If video file uploaded or videoURL provided -> upload to S3 (if file), then post via graph-video endpoint
    if (uploadedVideo || videoURL) {
      let finalVideoUrl = videoURL;
      if (uploadedVideo) {
        finalVideoUrl = await uploadFileToS3Service(
          `facebook_uploads/${userId}`,
          uploadedVideo.buffer,
          uploadedVideo.mimetype || "video/mp4",
        );
        try {
          await UserModel.findByIdAndUpdate(userId, {
            $set: { "facebook.last_uploaded_video": finalVideoUrl },
          });
        } catch (dbErr) {
          console.warn("Failed to save video URL:", dbErr);
        }
      }

      const uploadUrl = `https://graph-video.facebook.com/v19.0/${id}/videos`;
      const vidPayload: any = {
        file_url: finalVideoUrl,
        title: message || "",
      };
      if (scheduledPublishTime) {
        vidPayload.published = false;
        vidPayload.scheduled_publish_time = scheduledPublishTime;
      }
      const resp = await axios.post(uploadUrl, vidPayload, {
        headers: { Authorization: `Bearer ${pageAccessToken}` },
      });

      // Save to history if not scheduled
      // Construct proper post ID (pageId_videoId) for correct metrics fetching
      if (!scheduledPublishTime) {
        await PostedContentModel.create({
          user_id: userId,
          platform: "facebook",
          content: message || "",
          media_urls: [finalVideoUrl],
          media_type: "video",
          posted_at: new Date(),
          platform_post_id: `${pageId}_${resp.data.id}`,
          is_scheduled: false,
          status: "published",
          page_id: pageId,
        });
      }

      if (scheduledPublishTime) {
        const detailsUrl = `https://graph-video.facebook.com/v19.0/${resp.data.id}?fields=id,permalink_url,scheduled_publish_time,title,description,created_time,thumbnails{uri},is_published`;
        const detailsRes = await axios.get(detailsUrl, {
          headers: { Authorization: `Bearer ${pageAccessToken}` },
        });
        const sp = detailsRes.data || {};
        const thumb = sp.thumbnails?.data?.[0]?.uri;
        const scheduledDetails = {
          id: sp.id || resp.data.id,
          title: sp.title || message || "",
          scheduledAt: sp.scheduled_publish_time
            ? new Date(sp.scheduled_publish_time * 1000).toISOString()
            : new Date(scheduledPublishTime * 1000).toISOString(),
          permalink_url: sp.permalink_url,
          thumbnail: thumb,
          created_time: sp.created_time,
          is_published: Boolean(sp.is_published),
        };
        return res.status(200).json({
          success: true,
          scheduled: true,
          scheduled_publish_time: scheduledPublishTime,
          details: scheduledDetails,
          message: "Video scheduled",
        });
      }
      return res.status(200).json({
        success: true,
        videoId: resp.data.id,
        scheduled: Boolean(scheduledPublishTime),
        scheduled_publish_time: scheduledPublishTime || undefined,
        message: scheduledPublishTime ? "Video scheduled" : "Video posted",
      });
    }

    return res.status(400).json({ error: "No valid content to post" });
  } catch (error: any) {
    console.error(
      "Universal Facebook post error:",
      error.response?.data || error.message,
    );
    return res
      .status(500)
      .json({ success: false, error: error.response?.data || error.message });
  }
};

export const getFacebookAllDetails = async (req: Request, res: Response) => {
  try {
    const { userId, pageId } = req.query as {
      userId?: string;
      pageId?: string;
    };
    if (!userId || !pageId) {
      return res
        .status(400)
        .json({ success: false, message: "userId and pageId are required" });
    }

    const { pageAccessToken, id: resolvedPageId } = await getPageTokenService(
      userId,
      pageId,
    );
    const pid = resolvedPageId || (pageId as string);

    // Build dashboard using modular services; handle missing insights with flags
    const dashboard = await buildFacebookDashboardBuilder(
      pid,
      pageAccessToken,
      "28d",
    );

    return res.status(200).json({ success: true, result: dashboard });
  } catch (error: any) {
    console.error(
      "Error fetching Facebook all details:",
      error.response?.data || error.message,
    );
    return res.status(500).json({
      success: false,
      message: "Failed to fetch facebook details",
      error: error.response?.data || error.message,
    });
  }
};

export const disconnectFacebook = async (req: Request, res: Response) => {
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

    const tokenToRevoke = user.facebook?.access_token;

    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      {
        $set: {
          "facebook.project_id": null,
          "facebook.name": null,
          "facebook.access_token": null,
        },
      },
      { new: true },
    ).exec();

    if (tokenToRevoke) {
      try {
        // Revoke app permissions for the user
        await axios.delete(`${FACEBOOK_GRAPH_URL}/me/permissions`, {
          headers: { Authorization: `Bearer ${tokenToRevoke}` },
        });
      } catch (revokeErr: any) {
        console.warn(
          "Failed to revoke Facebook token:",
          revokeErr?.response?.data || revokeErr?.message || revokeErr,
        );
      }
    }

    return res.status(200).json({
      success: true,
      message: "Facebook disconnected successfully",
      user: updatedUser,
    });
  } catch (error: any) {
    console.error("Error disconnecting Facebook:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to disconnect Facebook",
      error: error.message,
    });
  }
};
