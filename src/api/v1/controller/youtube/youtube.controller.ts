import { Request, Response } from "express";
import { google } from "googleapis";
import { config } from "dotenv";
import UserModel from "../../../../models/users/users.model";
import axios from "axios";
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
  const scopes = [
    "https://www.googleapis.com/auth/youtube.upload",
    "https://www.googleapis.com/auth/youtube.readonly",
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
  console.log("Code and stste <=======>", code, state);
  const user_id = atob(state as string);
  console.log("<======> user id : ", user_id);
  console.log(user_id);
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
      const res = await UserModel.findByIdAndUpdate(
        { _id: user_id },
        { $set: { "youtube.access_token": tokens.refresh_token } },
        { new: true },
      );

      console.log("...........", res);
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
    const uploadResponse = await youtube.videos.insert({
      part: ["snippet", "status"],
      requestBody: {
        snippet: {
          title: title || "Untitled Video",
          description: description || "",
          tags: tags || [],
        },
        status: {
          privacyStatus: privacyStatus || "public",
        },
      },
      media: {
        body: response.data,
      },
    });

    const videoId = uploadResponse.data.id;

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
