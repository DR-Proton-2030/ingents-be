import UserModel from "../../models/users/users.model";
import { 
  createInstagramMedia, 
  getInstagramMediaStatus, 
  publishInstagramMedia 
} from "./instagram.service";

export interface PostToInstagramParams {
  userId: string;
  message: string;
  mediaUrls?: string[];
  hashtags?: string[];
}

/**
 * Post content to Instagram - used by scheduler (Business API v20.0)
 */
export const postToInstagram = async ({
  userId,
  message,
  mediaUrls,
  hashtags,
}: PostToInstagramParams) => {
  // 1. Get user and credentials
  const user = await UserModel.findById(userId).exec();
  if (!user || !user.instagram?.access_token || !user.instagram?.project_id) {
    throw new Error("Instagram credentials not found or incomplete");
  }

  const accessToken = user.instagram.access_token;
  const igUserId = user.instagram.project_id;

  // 2. Prepare caption
  let caption = message;
  if (hashtags && hashtags.length > 0) {
    caption += "\n\n" + hashtags.map((tag) => (tag.startsWith("#") ? tag : `#${tag}`)).join(" ");
  }

  if (!mediaUrls || mediaUrls.length === 0) {
    throw new Error("Instagram requires media (image or video) to post");
  }

  const mediaUrl = mediaUrls[0];
  const isVideo = mediaUrl.includes("video") || mediaUrl.match(/\.(mp4|mov|avi|wmv|webm)$/i);

  // 3. Create media container
  const container = await createInstagramMedia({
    accessToken,
    igUserId,
    imageUrl: isVideo ? undefined : mediaUrl,
    videoUrl: isVideo ? mediaUrl : undefined,
    caption,
    mediaType: isVideo ? "REELS" : "IMAGE",
  });

  const containerId = container.id;

  // 4. For videos/reels, wait for processing to finish
  if (isVideo) {
    let status = "IN_PROGRESS";
    let attempts = 0;
    while (status !== "FINISHED" && attempts < 40) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      const statusData = await getInstagramMediaStatus({
        accessToken,
        containerId: containerId,
      });
      status = statusData.status_code || statusData.status;
      if (status === "ERROR") throw new Error("Instagram video processing failed");
      if (status === "FINISHED") break;
      attempts++;
    }
    if (status !== "FINISHED") {
      throw new Error(`Video processing timed out with status: ${status}`);
    }
  }

  // 5. Publish the media
  const published = await publishInstagramMedia({
    accessToken,
    igUserId,
    containerId: containerId,
  });

  return published;
};

export * from "./instagram.service";
