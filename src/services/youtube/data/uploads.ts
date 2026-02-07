import type { youtube_v3 } from "googleapis";

export const paginateUploads = async (
  youtube: youtube_v3.Youtube,
  uploadsPlaylistId: string | null | undefined,
  initialResponse: any,
): Promise<any[]> => {
  const initialItems: any[] = [
    ...(((initialResponse?.data || {}) as any).items || []),
  ];
  const allItems = [...initialItems];
  if (!uploadsPlaylistId) return allItems;
  let nextPageToken: string | undefined =
    (initialResponse?.data as any)?.nextPageToken || undefined;
  while (nextPageToken) {
    const resp = await youtube.playlistItems.list({
      part: ["snippet", "contentDetails"],
      playlistId: uploadsPlaylistId,
      maxResults: 50,
      pageToken: nextPageToken,
    });
    allItems.push(...((resp.data.items as any[]) || []));
    nextPageToken = (resp.data as any)?.nextPageToken || undefined;
  }
  return allItems;
};
