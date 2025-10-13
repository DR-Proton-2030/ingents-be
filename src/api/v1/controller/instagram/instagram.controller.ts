import { Request, Response } from "express";
import {
  getInstagramAuthURL,
  getInstagramUser,
} from "../../../../services/instagram/instagram.service";

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
    const userId = atob(state as string);
    // Redirect to frontend with token & pages as query params
    res.redirect(
      `http://localhost:3000/dashboard/social-media?platform=instagram&token=${tokens.access_token}&user_id=${userId}`
    );
  } catch (error) {
    console.error("OAuth authentication failed:", error);
    res.status(500).json({ error: "OAuth authentication failed" });
  }
};
