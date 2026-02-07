import type { youtube_v3 } from "googleapis";

export type VideoStatsMap = Record<string, youtube_v3.Schema$Video>;

export const fetchVideoStatsMap = async (
  youtube: youtube_v3.Youtube,
  videoIds: string[],
): Promise<VideoStatsMap> => {
  const map: VideoStatsMap = {};
  if (!videoIds?.length) return map;
  const resp = await youtube.videos.list({
    part: ["snippet", "statistics", "contentDetails", "status"],
    id: videoIds,
  });
  resp.data.items?.forEach((v) => {
    if (v.id) map[v.id] = v;
  });
  return map;
};

export const fetchMetaForVideos = async (
  youtube: youtube_v3.Youtube,
  ids: string[],
): Promise<Record<string, youtube_v3.Schema$Video>> => {
  const map: Record<string, youtube_v3.Schema$Video> = {};
  if (!ids?.length) return map;
  const resp = await youtube.videos.list({
    part: ["snippet", "statistics", "contentDetails", "status"],
    id: ids,
  });
  resp.data.items?.forEach((v) => {
    if (v.id) map[v.id] = v;
  });
  return map;
};
