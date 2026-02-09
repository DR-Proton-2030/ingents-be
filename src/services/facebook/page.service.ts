import { getPageDetails } from "./page";

export type PageProfile = {
  id?: string;
  name?: string;
  about?: string;
  fan_count?: number;
  link?: string;
  cover?: any;
  category?: string;
  location?: any;
  username?: string;
  picture?: { data?: { url?: string } } | { url?: string } | any;
};

// Fetch basic page profile and metadata. Returns null on error.
export async function getPageProfile(
  pageId: string,
  accessToken: string,
): Promise<PageProfile | null> {
  return getPageDetails(pageId, accessToken);
}
