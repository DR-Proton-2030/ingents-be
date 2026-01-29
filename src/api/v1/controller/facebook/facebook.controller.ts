import { Request, Response } from "express";
import {
  getFacebookAuthURL,
  getFacebookUser,
  getLongLivedToken,
  getPageTokenService,
} from "../../../../services/facebook/facebook.service";
import axios from "axios";
import FormData from "form-data";
import { uploadFileToS3Service } from "../../../../services/uploadFile/uploadFile";
import UserModel from "../../../../models/users/users.model";
const FACEBOOK_GRAPH_URL = "https://graph.facebook.com/v20.0";

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
    const { code, state } = req.query;

    console.log("===>called state", state);
    console.log("Facebook callback code and state : ", code, state);
    if (!code) return res.status(400).json({ error: "No code provided" });

    // Exchange code for access token & user data
    const { tokens, user } = await getFacebookUser(code as string);

    console.log("====>state : ", state);
    const userId = atob(state as string);
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
    const userId = req.query.userId as string;
    console.log("===========>", userId);
    if (!userAccessToken) {
      return res
        .status(401)
        .json({ error: "Unauthorized - Missing Facebook Token" });
    }
    if (!userId) {
      return res.status(400).json({ error: "Missing userId in query" });
    }

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
      axios.get(
        `https://graph.facebook.com/v18.0/me/accounts?fields=id,name,access_token&access_token=${longLivedToken}`,
      ),
    ]);

    console.log("Saved user token : ", savedUser);
    return res.json({
      message: "Token saved and pages fetched successfully",
      user: savedUser,
      result: pagesResponse.data.data,
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

    if (!userId || !pageId) {
      return res.status(400).json({ error: "userId and pageId are required" });
    }

    // Get page access token
    const { pageAccessToken, id } = await getPageTokenService(userId, pageId);

    // Priority: if message only, post text; if image present (file or url), post image; if video present, post video
    if (message && !uploadedImage && !uploadedVideo && !imageUrl && !videoURL) {
      // Text only
      const postRes = await axios.post(`${FACEBOOK_GRAPH_URL}/${id}/feed`, {
        message,
        access_token: pageAccessToken,
      });
      return res
        .status(200)
        .json({
          success: true,
          postId: postRes.data.id,
          message: "Text posted",
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

      const imgRes = await axios.post(`${FACEBOOK_GRAPH_URL}/${id}/photos`, {
        url: finalImageUrl,
        caption: message || "",
        access_token: pageAccessToken,
      });
      return res
        .status(200)
        .json({
          success: true,
          postId: imgRes.data.id,
          message: "Image posted",
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
      const resp = await axios.post(
        uploadUrl,
        {
          file_url: finalVideoUrl,
          title: message || "",
        },
        {
          headers: { Authorization: `Bearer ${pageAccessToken}` },
        },
      );
      return res
        .status(200)
        .json({
          success: true,
          videoId: resp.data.id,
          message: "Video posted",
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
