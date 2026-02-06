import axios from "axios";
import UserModel from "../../models/users/users.model";
import { getPageTokenService } from "../facebook/facebook.service";
import { getAuthorizedClient } from "../youtube/youtube.service";
import { getXUserProfile, refreshXToken } from "../x/x.service";

export async function fetchSocialMetrics(userId: string): Promise<{
  items: Array<{
    platform: string;
    metric: "followers" | "subscribers";
    count: number;
  }>;
  errors?: Array<{ platform: string; message: string }>;
}> {
  const errors: Array<{ platform: string; message: string }> = [];
  const items: Array<{
    platform: string;
    metric: "followers" | "subscribers";
    count: number;
  }> = [];

  // Load user for tokens once
  const user = await UserModel.findById(userId).exec();
  if (!user) {
    throw new Error("User not found");
  }

  // Facebook followers (fan_count from Page)
  try {
    if (user.facebook?.access_token) {
      // Prefer a specifically connected page if recorded
      const preferredPageId = user.facebook?.project_id || undefined;
      if (preferredPageId) {
        try {
          const { pageAccessToken, id } = await getPageTokenService(
            userId,
            preferredPageId,
          );
          const pageDetails = await axios.get(
            `https://graph.facebook.com/v20.0/${id}?fields=fan_count`,
            { headers: { Authorization: `Bearer ${pageAccessToken}` } },
          );
          const fanCount = Number(pageDetails.data?.fan_count || 0);
          items.push({
            platform: "facebook",
            metric: "followers",
            count: fanCount,
          });
        } catch (prefErr) {
          // Fall back to scanning all pages if preferred lookup fails
          const pagesResp = await axios.get(
            `https://graph.facebook.com/v20.0/me/accounts?fields=id,name,access_token&access_token=${user.facebook.access_token}`,
          );
          const pages = pagesResp.data?.data || [];
          if (!pages.length) {
            items.push({ platform: "facebook", metric: "followers", count: 0 });
          } else {
            const counts = await Promise.all(
              pages.slice(0, 10).map(async (p: any) => {
                try {
                  const resp = await axios.get(
                    `https://graph.facebook.com/v20.0/${p.id}?fields=fan_count`,
                    { headers: { Authorization: `Bearer ${p.access_token}` } },
                  );
                  return Number(resp.data?.fan_count || 0);
                } catch (_) {
                  return 0;
                }
              }),
            );
            const maxCount = counts.reduce((a, b) => (b > a ? b : a), 0);
            items.push({
              platform: "facebook",
              metric: "followers",
              count: maxCount,
            });
          }
        }
      } else {
        // Fetch all managed pages and use the one with the highest fan_count
        const pagesResp = await axios.get(
          `https://graph.facebook.com/v20.0/me/accounts?fields=id,name,access_token&access_token=${user.facebook.access_token}`,
        );
        const pages = pagesResp.data?.data || [];
        if (!pages.length) {
          items.push({ platform: "facebook", metric: "followers", count: 0 });
        } else {
          const counts = await Promise.all(
            pages.slice(0, 10).map(async (p: any) => {
              try {
                const resp = await axios.get(
                  `https://graph.facebook.com/v20.0/${p.id}?fields=fan_count`,
                  { headers: { Authorization: `Bearer ${p.access_token}` } },
                );
                return Number(resp.data?.fan_count || 0);
              } catch (_) {
                return 0;
              }
            }),
          );
          const maxCount = counts.reduce((a, b) => (b > a ? b : a), 0);
          items.push({
            platform: "facebook",
            metric: "followers",
            count: maxCount,
          });
        }
      }
    } else {
      // Graceful fallback: return zero followers without raising an error
      items.push({ platform: "facebook", metric: "followers", count: 0 });
    }
  } catch (fbErr: any) {
    const status = fbErr?.response?.status;
    let message =
      fbErr?.response?.data?.error?.message ||
      fbErr?.message ||
      "Failed to fetch Facebook followers";
    if (status === 401) message = "Invalid or expired Facebook access token";
    else if (status === 403)
      message = "Insufficient Facebook permissions to access pages";
    else if (status === 429) message = "Facebook rate limit exceeded";
    errors.push({ platform: "facebook", message });
  }

  // YouTube subscribers
  try {
    const ytToken = user.youtube?.access_token;
    if (ytToken) {
      const { youtube } = await getAuthorizedClient(ytToken);
      const { data } = await youtube.channels.list({
        part: ["statistics"],
        mine: true,
      });
      const stats = data.items?.[0]?.statistics;
      const subsStr = stats?.subscriberCount;
      const hidden = (stats as any)?.hiddenSubscriberCount === true;
      if (hidden) {
        errors.push({
          platform: "youtube",
          message: "Subscriber count hidden by channel settings",
        });
      }
      if (subsStr == null) {
        errors.push({
          platform: "youtube",
          message: "Subscriber count unavailable (may be hidden)",
        });
      }
      if (!hidden) {
        const subs = subsStr ? Number(subsStr) : 0;
        items.push({ platform: "youtube", metric: "subscribers", count: subs });
      }
    } else {
      errors.push({
        platform: "youtube",
        message: "Missing YouTube refresh token",
      });
    }
  } catch (ytErr: any) {
    const status = ytErr?.response?.status;
    let message =
      ytErr?.response?.data?.error?.message ||
      ytErr?.message ||
      "Failed to fetch YouTube subscribers";
    if (status === 401) message = "Invalid or expired YouTube token";
    else if (status === 403)
      message = "YouTube access forbidden (check scopes/permissions)";
    else if (status === 429) message = "YouTube rate limit exceeded";
    errors.push({ platform: "youtube", message });
  }

  // X followers
  try {
    const xAccessToken = user.x?.access_token;
    if (xAccessToken) {
      // Prefer the authenticated user via access token
      let profile: any;
      try {
        profile = await getXUserProfile(xAccessToken);
      } catch (innerErr: any) {
        const status = innerErr?.response?.status;
        const hasRefresh = Boolean(user.x?.refresh_token);
        if (status === 401 && hasRefresh) {
          // Attempt a one-time refresh and retry
          try {
            const tokens = await refreshXToken(userId);
            profile = await getXUserProfile(tokens.access_token);
          } catch (refreshErr: any) {
            const rStatus = refreshErr?.response?.status;
            let message =
              refreshErr?.response?.data?.error ||
              refreshErr?.message ||
              "Failed to refresh X token";
            if (rStatus === 401) message = "Invalid X refresh token";
            else if (rStatus === 403)
              message = "X refresh forbidden (check app scopes)";
            else if (rStatus === 429)
              message = "X rate limit exceeded during refresh";
            errors.push({ platform: "x", message });
          }
        } else {
          // Bubble up original error if not refreshable
          throw innerErr;
        }
      }

      if (profile) {
        const followersRaw = profile?.public_metrics?.followers_count;
        if (followersRaw == null) {
          errors.push({
            platform: "x",
            message:
              "Followers count unavailable from X API (check app access and scopes)",
          });
        }
        const followers = followersRaw != null ? Number(followersRaw) : 0;
        items.push({ platform: "x", metric: "followers", count: followers });
      }
    } else {
      errors.push({ platform: "x", message: "Missing X access token" });
    }
  } catch (xErr: any) {
    const status = xErr?.response?.status;
    let message =
      xErr?.response?.data?.error ||
      xErr?.message ||
      "Failed to fetch X followers";
    if (status === 401) message = "Invalid or expired X (Twitter) access token";
    else if (status === 403) message = "X access forbidden (check app scopes)";
    else if (status === 429) message = "X rate limit exceeded";
    errors.push({ platform: "x", message });
  }

  return { items, errors };
}
