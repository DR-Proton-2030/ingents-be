import { google } from "googleapis";
import UserModel from "../../models/users/users.model";
import { getAuthorizedClient } from "./youtube.service";

export interface PostToYoutubeParams {
  userId: string;
  title: string;
  description: string;
  videoUrl: string;
  tags?: string[];
  privacyStatus?: "public" | "private" | "unlisted";
  categoryId?: string;
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

  return response.data;
};

export * from "./youtube.service";
