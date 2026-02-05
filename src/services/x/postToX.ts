import axios from "axios";
import FormData from "form-data";
import UserModel from "../../models/users/users.model";
import { refreshXToken } from "./x.service";

export interface PostToXParams {
  userId: string;
  message: string;
  mediaUrls?: string[];
  hashtags?: string[];
}

/**
 * Post content to X (Twitter) - used by scheduler
 */
export const postToX = async ({
  userId,
  message,
  mediaUrls,
  hashtags,
}: PostToXParams) => {
  // Get user and access token
  const user = await UserModel.findById(userId).exec();
  if (!user || !user.x?.access_token) {
    throw new Error("X user access token not found");
  }

  let accessToken = user.x.access_token;

  // Append hashtags to message
  let fullMessage = message;
  if (hashtags && hashtags.length > 0) {
    fullMessage += "\n\n" + hashtags.map((tag) => (tag.startsWith("#") ? tag : `#${tag}`)).join(" ");
  }

  // Truncate to 280 characters if needed
  if (fullMessage.length > 280) {
    fullMessage = fullMessage.slice(0, 277) + "...";
  }

  const tweetPayload: any = {
    text: fullMessage,
  };

  // Upload media if provided
  if (mediaUrls && mediaUrls.length > 0) {
    try {
      const mediaIds = await uploadMediaToX(accessToken, mediaUrls);
      if (mediaIds.length > 0) {
        tweetPayload.media = {
          media_ids: mediaIds,
        };
      }
    } catch (mediaError: any) {
      console.warn("Failed to upload media to X:", mediaError.message);
      // Continue without media
    }
  }

  try {
    const response = await axios.post(
      "https://api.twitter.com/2/tweets",
      tweetPayload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  } catch (error: any) {
    // If token expired, try to refresh and retry
    if (error.response?.status === 401) {
      const tokens = await refreshXToken(userId);
      accessToken = tokens.access_token;

      const retryResponse = await axios.post(
        "https://api.twitter.com/2/tweets",
        tweetPayload,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );
      return retryResponse.data;
    }
    throw error;
  }
};

/**
 * Upload media to X and return media IDs
 */
async function uploadMediaToX(accessToken: string, mediaUrls: string[]): Promise<string[]> {
  const mediaIds: string[] = [];

  for (const mediaUrl of mediaUrls.slice(0, 4)) { // X allows max 4 media
    try {
      // Download media from URL
      const mediaResponse = await axios.get(mediaUrl, {
        responseType: "arraybuffer",
      });

      const mediaBuffer = Buffer.from(mediaResponse.data);
      const mediaBase64 = mediaBuffer.toString("base64");
      const contentType = mediaResponse.headers["content-type"] || "image/jpeg";

      // Check if it's a video
      const isVideo = contentType.includes("video");

      if (isVideo) {
        // For videos, use chunked upload
        // This is a simplified version - full implementation requires chunked upload
        console.warn("Video upload to X requires chunked upload implementation");
        continue;
      }

      // Upload image using v1.1 API
      const uploadResponse = await axios.post(
        "https://upload.twitter.com/1.1/media/upload.json",
        `media_data=${encodeURIComponent(mediaBase64)}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      if (uploadResponse.data?.media_id_string) {
        mediaIds.push(uploadResponse.data.media_id_string);
      }
    } catch (error: any) {
      console.warn(`Failed to upload media ${mediaUrl}:`, error.message);
    }
  }

  return mediaIds;
}

export * from "./x.service";
