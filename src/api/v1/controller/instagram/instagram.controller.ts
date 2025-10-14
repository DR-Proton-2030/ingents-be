import { Request, Response } from "express";
import {
  createInstagramMedia,
  getInstagramAuthURL,
  getInstagramLongLivedToken,
  getInstagramProfile,
  getInstagramUser,
  publishInstagramMedia,
} from "../../../../services/instagram/instagram.service";
import UserModel from "../../../../models/users/users.model";

export const instagrmaLogin = (req: Request, res: Response) => {
  const { user_id } = req.query;
  console.log("user_id", user_id);
  if (!user_id) return res.status(400).json({ error: "Client ID is required" });
  const authUrl = getInstagramAuthURL(user_id as string);
  res.redirect(authUrl);
};

export const instagramAuthCallback = async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query;

    console.log("Instagram code and stste : ", code, state);
    if (!code) return res.status(400).json({ error: "No code provided" });

    // Exchange code for access token & user data
    const { tokens } = await getInstagramUser(code as string);

    console.log("====>state : ", state);
    const userId = state ? atob(state as string) : null;
    // Redirect to frontend with token & pages as query params
    res.redirect(
      `http://localhost:3000/dashboard/social-media?platform=instagram&token=${tokens.access_token}&user_id=${userId}`
    );
  } catch (error) {
    console.error("OAuth authentication failed:", error);
    res.status(500).json({ error: "OAuth authentication failed" });
  }
};

export const fetchInstagramProfileController = async (
  req: Request,
  res: Response
) => {
  try {
    const { access_token, userId } = req.query;

    if (!access_token || typeof access_token !== "string") {
      return res.status(400).json({ error: "Access token is required" });
    }

    if (!userId) {
      return res.status(400).json({ error: "Missing userId in query" });
    }

    const longTokenResponse = await getInstagramLongLivedToken(access_token);
    console.log(longTokenResponse);
    const longLivedToken = longTokenResponse.access_token;

    const [savedUser, profile] = await Promise.all([
      UserModel.findByIdAndUpdate(
        userId,
        { $set: { "instagram.access_token": longLivedToken } },
        { new: true }
      ),
      getInstagramProfile(longLivedToken),
    ]);
    console.log(savedUser);
    res.status(200).json({
      success: true,
      user: savedUser,
      result: profile,
    });
  } catch (error: any) {
    console.error("Failed to get Instagram profile:", error.message);
    res.status(500).json({ error: "Failed to fetch Instagram profile" });
  }
};

export const publishInstagramPost = async (req: Request, res: Response) => {
  try {
    const { access_token, igUserId, image_url, caption } = req.body;

    if (!access_token || !igUserId || !image_url) {
      return res
        .status(400)
        .json({ error: "access_token, igUserId and image_url are required" });
    }

    const container = await createInstagramMedia({
      accessToken: access_token,
      igUserId,
      imageUrl: image_url,
      caption,
    });

    const published = await publishInstagramMedia({
      accessToken: access_token,
      igUserId,
      containerId: container.id,
    });

    res.status(200).json({
      success: true,
      message: "Instagrma post published successfully....",
      containerId: container.id,
      postId: published.id,
    });
  } catch (error: any) {
    console.error("Failed to publish Instagram post:", error.message);
    res.status(500).json({
      error: "Failed to publish Instagram post",
    });
  }
};
