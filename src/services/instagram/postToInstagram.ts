import axios from "axios";
import UserModel from "../../models/users/users.model";

export interface PostToInstagramParams {
  userId: string;
  message: string;
  mediaUrls?: string[];
  hashtags?: string[];
}

/**
 * Post content to Instagram - used by scheduler
 */
export const postToInstagram = async ({
  userId,
  message,
  mediaUrls,
  hashtags,
}: PostToInstagramParams) => {
  // Get user and access token
  const user = await UserModel.findById(userId).exec();
  if (!user || !user.instagram?.access_token) {
    throw new Error("Instagram user access token not found");
  }

  const accessToken = user.instagram.access_token;
  const igUserId = user.instagram.project_id;

  if (!igUserId) {
    throw new Error("Instagram user ID not found");
  }

  // Append hashtags to message
  let caption = message;
  if (hashtags && hashtags.length > 0) {
    caption += "\n\n" + hashtags.map((tag) => (tag.startsWith("#") ? tag : `#${tag}`)).join(" ");
  }

  if (!mediaUrls || mediaUrls.length === 0) {
    throw new Error("Instagram requires media (image or video) to post");
  }

  const mediaUrl = mediaUrls[0];
  const isVideo = mediaUrl.includes("video") || mediaUrl.match(/\.(mp4|mov|avi|wmv|webm)$/i);

  // Create media container
  const containerPayload: any = {
    caption,
  };

  if (isVideo) {
    containerPayload.media_type = "REELS";
    containerPayload.video_url = mediaUrl;
  } else {
    containerPayload.image_url = mediaUrl;
  }

  const createContainerRes = await axios.post(
    `https://graph.instagram.com/v18.0/${igUserId}/media`,
    containerPayload,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    }
  );

  const containerId = createContainerRes.data.id;

  // For videos, we need to wait for processing
  if (isVideo) {
    let status = "IN_PROGRESS";
    let attempts = 0;
    const maxAttempts = 30; // 5 minutes max wait

    while (status === "IN_PROGRESS" && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 10000)); // Wait 10 seconds

      const statusRes = await axios.get(
        `https://graph.instagram.com/v18.0/${containerId}?fields=status_code`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      status = statusRes.data.status_code;
      attempts++;
    }

    if (status !== "FINISHED") {
      throw new Error(`Video processing failed or timed out. Status: ${status}`);
    }
  }

  // Publish the media
  const publishRes = await axios.post(
    `https://graph.instagram.com/v18.0/${igUserId}/media_publish`,
    {
      creation_id: containerId,
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    }
  );

  return publishRes.data;
};

export * from "./instagram.service";
