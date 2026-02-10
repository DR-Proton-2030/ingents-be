import axios from "axios";
import dotenv from "dotenv";
import UserModel from "../../models/users/users.model";

dotenv.config();

const FACEBOOK_CLIENT_ID = process.env.FACEBOOK_CLIENT_ID!;
const FACEBOOK_CLIENT_SECRET = process.env.FACEBOOK_CLIENT_SECRET!;
const REDIRECT_URI = process.env.FACEBOOK_REDIRECT_URI!;
const FACEBOOK_GRAPH_URL = "https://graph.facebook.com";

export const getFacebookAuthURL = (userId: string) => {
  const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${FACEBOOK_CLIENT_ID}&redirect_uri=${encodeURIComponent(
    REDIRECT_URI,
  )}&scope=email,public_profile,pages_read_engagement,pages_manage_posts,pages_show_list&response_type=code&state=${userId}&auth_type=rerequest&return_scopes=true`;
  return authUrl;
};
// cl
export const getFacebookUser = async (code: string) => {
  const tokenUrl = `https://graph.facebook.com/v18.0/oauth/access_token`;

  const params = new URLSearchParams({
    client_id: FACEBOOK_CLIENT_ID,
    client_secret: FACEBOOK_CLIENT_SECRET,
    redirect_uri: REDIRECT_URI,
    code,
  }).toString();

  const { data } = await axios.get(`${tokenUrl}?${params}`);
  const accessToken = data.access_token;

  // Fetch user details
  const userResponse = await axios.get(
    `https://graph.facebook.com/me?fields=id,name,email&access_token=${accessToken}`,
  );
  console.log(userResponse);
  return { tokens: { access_token: accessToken }, user: userResponse.data };
};

export const getFacebookPages = async (accessToken: string) => {
  const pagesUrl = `${FACEBOOK_GRAPH_URL}/me/accounts`;

  const { data } = await axios.get(pagesUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return data.data; // List of pages
};

export const fetchFacebookPagesFromCode = async (code: string) => {
  const { tokens, user } = await getFacebookUser(code);
  const longLivedToken = await getLongLivedToken(tokens.access_token);
  const pages = await getFacebookPages(longLivedToken);

  return {
    user,
    access_token: longLivedToken,
    pages,
  };
};

// Get Long Lived Token

export const getLongLivedToken = async (access_token: string) => {
  const res = await axios.get(
    "https://graph.facebook.com/v19.0/oauth/access_token",
    {
      params: {
        grant_type: "fb_exchange_token",
        client_id: FACEBOOK_CLIENT_ID,
        client_secret: FACEBOOK_CLIENT_SECRET,
        fb_exchange_token: access_token,
      },
    },
  );
  console.log("Long-Lived Token:", res.data.access_token);
  return res.data.access_token;
};

export const getPageTokenService = async (userId: string, pageId: string) => {
  if (!userId || !pageId) {
    throw new Error("userId and pageId are required");
  }
  const user = await UserModel.findById(userId).exec();
  if (!user || !user.facebook?.access_token) {
    throw new Error("Facebook user access token not found");
  }

  const userAccessToken = user.facebook.access_token;

  // Request fields explicitly; newer Graph versions may omit access_token unless asked.
  const pagesRes = await axios.get(
    `https://graph.facebook.com/v20.0/me/accounts?fields=id,name,access_token,category&access_token=${userAccessToken}`,
  );
  const pageData = pagesRes.data?.data?.find((p: any) => p.id === pageId);

  console.log("Fetched pages for user:", pagesRes.data);
  if (!pageData) {
    throw new Error("Page not found or user is not admin of this page");
  }

  return {
    id: pageData.id,
    pageName: pageData.name,
    pageAccessToken: pageData.access_token,
    category: pageData.category,
    user,
  };
};

// Helper to resolve scheduled publish time in UNIX seconds
export const resolveScheduledPublishTime = (body: any): number | null => {
  try {
    if (!body) return null;
    // Accept multiple input styles
    const raw =
      body.scheduled_publish_time ??
      body.scheduleAt ??
      body.scheduledAt ??
      body.publishAt ??
      null;
    if (raw) {
      // If already a number (seconds) or string number
      const num = Number(raw);
      if (!Number.isNaN(num)) {
        // If looks like milliseconds, convert to seconds
        return num > 1e12 ? Math.floor(num / 1000) : Math.floor(num);
      }
      // ISO string
      const d = new Date(String(raw));
      if (!isNaN(d.getTime())) return Math.floor(d.getTime() / 1000);
    }
    // Composite date + time
    if (body.scheduleDate && body.scheduleTime) {
      const composed = new Date(
        `${body.scheduleDate}T${body.scheduleTime}:00Z`,
      );
      if (!isNaN(composed.getTime()))
        return Math.floor(composed.getTime() / 1000);
    }
    return null;
  } catch (_) {
    return null;
  }
};

// Validate scheduled publish time per Facebook constraints
// - Must be at least 10 minutes in the future
// - Must be no more than 75 days in the future
export const validateScheduledPublishTime = (
  scheduledPublishTime: number | null,
): string | null => {
  if (!scheduledPublishTime) return null; // no scheduling -> valid
  const nowSec = Math.floor(Date.now() / 1000);
  const minFuture = nowSec + 10 * 60; // 10 minutes
  const maxFuture = nowSec + 75 * 24 * 60 * 60; // 75 days

  if (scheduledPublishTime < minFuture) {
    return "scheduled_publish_time must be at least 10 minutes in the future";
  }
  if (scheduledPublishTime > maxFuture) {
    return "scheduled_publish_time cannot be more than 75 days in the future";
  }
  return null;
};
