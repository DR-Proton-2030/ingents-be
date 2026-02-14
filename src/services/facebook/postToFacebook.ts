import axios from "axios";
import { getPageTokenService } from "./facebook.service";

const FACEBOOK_GRAPH_URL = "https://graph.facebook.com";

export interface PostToFacebookParams {
  userId: string;
  pageId: string;
  message: string;
  mediaUrls?: string[];
  hashtags?: string[];
}

/**
 * Post content to Facebook page - used by scheduler
 */
export const postToFacebook = async ({
  userId,
  pageId,
  message,
  mediaUrls,
  hashtags,
}: PostToFacebookParams) => {
  // Get page access token
  const { pageAccessToken } = await getPageTokenService(userId, pageId);

  // Append hashtags to message
  let fullMessage = message;
  if (hashtags && hashtags.length > 0) {
    fullMessage += "\n\n" + hashtags.map((tag) => (tag.startsWith("#") ? tag : `#${tag}`)).join(" ");
  }

  // Post based on media type
  if (mediaUrls && mediaUrls.length > 0) {
    // Check if it's a video
    const isVideo = mediaUrls[0].includes("video") || mediaUrls[0].match(/\.(mp4|mov|avi|wmv|webm)$/i);

    if (isVideo) {
      // Post video
      const videoRes = await axios.post(
        `${FACEBOOK_GRAPH_URL}/v20.0/${pageId}/videos`,
        {
          file_url: mediaUrls[0],
          description: fullMessage,
        },
        {
          headers: {
            Authorization: `Bearer ${pageAccessToken}`,
          },
        }
      );
      return videoRes.data;
    } else {
      // Post with photo
      const photoRes = await axios.post(
        `${FACEBOOK_GRAPH_URL}/v20.0/${pageId}/photos`,
        {
          url: mediaUrls[0],
          message: fullMessage,
        },
        {
          headers: {
            Authorization: `Bearer ${pageAccessToken}`,
          },
        }
      );
      return photoRes.data;
    }
  } else {
    // Text-only post
    const postRes = await axios.post(
      `${FACEBOOK_GRAPH_URL}/v20.0/${pageId}/feed`,
      {
        message: fullMessage,
      },
      {
        headers: {
          Authorization: `Bearer ${pageAccessToken}`,
        },
      }
    );
    return postRes.data;
  }
};

export * from "./facebook.service";
