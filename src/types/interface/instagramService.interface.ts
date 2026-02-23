export interface InstagramPostParams {
  accessToken: string;
  igUserId: string;
  imageUrl?: string;
  videoUrl?: string;
  caption?: string;
  mediaType?: "IMAGE" | "VIDEO" | "REELS" | "STORIES";
}
