import axios from "axios";

const FACEBOOK_GRAPH_URL = "https://graph.facebook.com/v20.0";

export async function getPageDetails(pageId: string, accessToken: string) {
  const url = `${FACEBOOK_GRAPH_URL}/${pageId}`;
  const fields = [
    "id",
    "name",
    "about",
    "fan_count",
    "link",
    "cover",
    "category",
    "location",
    "username",
    "picture{url}",
  ].join(",");
  try {
    const resp = await axios.get(url, {
      params: { fields },
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return resp.data;
  } catch (_) {
    return null;
  }
}

export async function getRecentPosts(
  pageId: string,
  accessToken: string,
  sinceISO: string,
  untilISO: string,
  limit = 25,
) {
  const url = `${FACEBOOK_GRAPH_URL}/${pageId}/posts`;
  const fields = [
    "id",
    "created_time",
    "message",
    "permalink_url",
    "full_picture",
    "type",
    // Include comments summary to mirror YouTube-like recent activity
    "comments.summary(true){id,message,created_time,from}",
  ].join(",");
  try {
    const resp = await axios.get(url, {
      params: { since: sinceISO, until: untilISO, limit, fields },
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return resp.data?.data || [];
  } catch (_) {
    return [];
  }
}

export async function getRecentVideos(
  pageId: string,
  accessToken: string,
  sinceISO: string,
  untilISO: string,
  limit = 25,
) {
  // Use page videos edge to retrieve page-owned videos during window
  const url = `${FACEBOOK_GRAPH_URL}/${pageId}/videos`;
  const fields = [
    "id",
    "created_time",
    "description",
    "permalink_url",
    "length",
    "thumbnails{uri}",
    "title",
  ].join(",");
  try {
    const resp = await axios.get(url, {
      params: { since: sinceISO, until: untilISO, limit, fields },
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return resp.data?.data || [];
  } catch (_) {
    return [];
  }
}
