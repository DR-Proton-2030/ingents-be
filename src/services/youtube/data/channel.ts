import type { youtube_v3 } from "googleapis";

export interface ChannelInfo {
  channelData: youtube_v3.Schema$Channel;
  channelId: string;
  uploadsPlaylistId?: string | null;
}

export const fetchChannelInfo = async (
  youtube: youtube_v3.Youtube,
): Promise<ChannelInfo> => {
  const resp = await youtube.channels.list({
    part: ["snippet", "statistics", "contentDetails", "brandingSettings"],
    mine: true,
  });

  if (!resp.data.items?.length) {
    throw new Error("No channel found");
  }
  const channelData = resp.data.items[0]!;
  const channelId = channelData.id!;
  const uploadsPlaylistId =
    channelData.contentDetails?.relatedPlaylists?.uploads || null;
  return { channelData, channelId, uploadsPlaylistId };
};
