export interface SocialMediaJobData {
  scheduledPostId: string;
  platform: "facebook" | "instagram" | "youtube" | "x";
  userId: string;
  content: string;
  mediaUrls?: string[];
  mediaType?: "image" | "video" | "text";
  hashtags?: string[];
  pageId?: string;
  channelId?: string;
  platformSpecificData?: Record<string, any>;
}