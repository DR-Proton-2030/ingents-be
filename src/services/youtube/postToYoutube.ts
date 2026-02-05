import { google } from "googleapis";
import UserModel from "../../models/users/users.model";
import { getAuthorizedClient } from "./youtube.service";
import { Readable } from "stream";

export interface PostToYoutubeParams {
  userId: string;
  title: string;
  description: string;
  videoUrl: string;
  tags?: string[];
  privacyStatus?: "public" | "private" | "unlisted";
  categoryId?: string;
  thumbnailDataUrl?: string;
}

/**
 * Post video to YouTube - used by scheduler
 */
export const postToYoutube = async ({
  userId,
  title,
  description,
  videoUrl,
  tags,
  privacyStatus = "public",
  categoryId = "22", // Default to "People & Blogs"
  thumbnailDataUrl,
}: PostToYoutubeParams) => {
  // Get user and access token
  const user = await UserModel.findById(userId).exec();
  if (!user || !user.youtube?.access_token) {
    throw new Error("YouTube user access token not found");
  }

  const refreshToken = user.youtube.access_token;

  // Get authorized client
  const { youtube } = await getAuthorizedClient(refreshToken);

  // Download video from URL
  const axios = (await import("axios")).default;
  const videoResponse = await axios.get(videoUrl, {
    responseType: "stream",
  });

  // Upload video to YouTube
  const response = await youtube.videos.insert({
    part: ["snippet", "status"],
    requestBody: {
      snippet: {
        title,
        description,
        tags,
        categoryId,
      },
      status: {
        privacyStatus,
        selfDeclaredMadeForKids: false,
      },
    },
    media: {
      body: videoResponse.data,
    },
  });

  const videoId = response.data.id;
  if (videoId && typeof thumbnailDataUrl === "string" && thumbnailDataUrl.startsWith("data:")) {
    try {
      const match = thumbnailDataUrl.match(/^data:(.+);base64,(.+)$/);
      if (match) {
        const buffer = Buffer.from(match[2], "base64");
        await youtube.thumbnails.set({
          videoId,
          media: { body: Readable.from(buffer) },
        });
      }
    } catch (err: any) {
      console.warn("Failed to set YouTube thumbnail (scheduler):", err?.message || err);
    }
  }

  return response.data;
};

export * from "./youtube.service";
