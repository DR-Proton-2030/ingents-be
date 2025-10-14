import { Request, Response } from "express";
import {
  getFacebookAuthURL,
  getFacebookUser,
  getLongLivedToken,
  getPageTokenService,
} from "../../../../services/facebook/facebook.service";
import axios from "axios";
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
      `http://localhost:3000/dashboard/social-media?platform=facebook&token=${
        tokens.access_token
      }&user=${encodeURIComponent(JSON.stringify(user))}&user_id=${userId}`
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
        { new: true }
      ),
      axios.get(
        `https://graph.facebook.com/v18.0/me/accounts?fields=id,name,access_token&access_token=${longLivedToken}`
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
      error.response?.data || error.message
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
        { new: true }
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

export const postFacebookText = async (req: Request, res: Response) => {
  try {
    const { userId, pageId, message } = req.body;

    if (!pageId || !message) {
      return res.status(400).json({ error: "pageId and message are required" });
    }

    const user = await UserModel.findById(userId).exec();

    if (!user) return res.status(404).json({ error: "User not found" });

    const userAccessToken = (user as any).facebook?.access_token;

    if (!userAccessToken) {
      return res.status(401).json({ error: "Facebook access token missing" });
    }

    //  Get Page Access Token from user token
    // const pagesRes = await axios.get(
    //   `${FACEBOOK_GRAPH_URL}/me/accounts?access_token=${userAccessToken}`
    // );
    // const pageData = pagesRes.data.data.find((p: any) => p.id === pageId);
    // console.log(pageData.id);
    const { pageAccessToken, id } = await getPageTokenService(userId, pageId);
    if (!id) {
      return res.status(403).json({
        error: "User is not an admin of this Page or Page not found",
      });
    }

    // Post message using Page Access Token
    const postRes = await axios.post(`${FACEBOOK_GRAPH_URL}/${id}/feed`, {
      message,
      access_token: pageAccessToken,
    });

    return res.status(200).json({
      success: true,
      postId: postRes.data.id,
      message: "Post published successfully!",
    });
  } catch (error: any) {
    console.error(
      "Facebook post error:",
      error.response?.data || error.message
    );
    return res.status(500).json({
      error: "Failed to post on Facebook",
      details: error.response?.data || error.message,
    });
  }
};

// Upload Facebook Video
export const uploadFacebookVideo = async (req: Request, res: Response) => {
  try {
    const { userId, title, description, videoURL } = req.body;

    if (!userId) {
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

    const user = await UserModel.findById(userId);
    if (!user || !user.facebook || !user.facebook.access_token) {
      return res.status(401).json({
        success: false,
        message: "User Facebook token not found",
      });
    }

    // const pageAccessToken =
    //   user.facebook.access_token || user.facebook.access_token;

    const { pageAccessToken, id } = await getPageTokenService(
      userId,
      user.facebook.project_id
    );

    const uploadUrl = `https://graph-video.facebook.com/v19.0/${user.facebook.project_id}/videos`;

    const response = await axios.post(
      uploadUrl,
      {
        file_url: videoURL,
        title: title || "Untitled Video",
        description: description || "",
      },
      {
        headers: {
          Authorization: `Bearer ${pageAccessToken}`,
        },
      }
    );

    return res.status(200).json({
      success: true,
      message: "Video uploaded successfully to Facebook",
      videoId: response.data.id,
      videoUrl: `https://www.facebook.com/${id}/videos/${response.data.id}`,
    });
  } catch (error: any) {
    console.error(
      "Facebook upload error:",
      error.response?.data || error.message
    );
    return res.status(500).json({
      success: false,
      message: "Video upload to Facebook failed",
      error: error.response?.data || error.message,
    });
  }
};

// Facebook photo post
export const postFacebookImage = async (req: Request, res: Response) => {
  try {
    const { userId, pageId, imageUrl, caption } = req.body;

    if (!userId || !pageId || !imageUrl) {
      return res.status(400).json({
        success: false,
        message: "userId, pageId and imageUrl are required",
      });
    }

    // Get page access token via service
    const { pageAccessToken, id } = await getPageTokenService(userId, pageId);

    // Post image to Facebook Page
    const fbResponse = await axios.post(`${FACEBOOK_GRAPH_URL}/${id}/photos`, {
      url: imageUrl,
      caption: caption || "",
      access_token: pageAccessToken,
    });

    return res.status(200).json({
      success: true,
      message: "Image posted successfully on Facebook!",
      postId: fbResponse.data.id,
      imageUrl,
    });
  } catch (error: any) {
    console.error(
      "Facebook image post error:",
      error.response?.data || error.message
    );
    return res.status(500).json({
      success: false,
      message: "Failed to post image on Facebook",
      error: error.response?.data || error.message,
    });
  }
};
