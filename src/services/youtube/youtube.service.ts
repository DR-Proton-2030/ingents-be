import axios from "axios";
import dotenv from "dotenv";
import UserModel from "../../models/users/users.model";
import { google } from "googleapis";

dotenv.config();

const YT_CLIENT_ID = process.env.YT_CLIENT_ID!;
const YT_CLIENT_SECRET = process.env.YT_CLIENT_SECRET!;
const YT_REDIRECT_URI = process.env.YT_REDIRECT_URI!;

/** Helper to get an authorized YouTube client using a refresh token */
export const getAuthorizedClient = async (refreshToken: string) => {
  const client = new google.auth.OAuth2(
    YT_CLIENT_ID,
    YT_CLIENT_SECRET,
    YT_REDIRECT_URI,
  );
  client.setCredentials({ refresh_token: refreshToken });
  const accessTokenResponse = await client.getAccessToken();
  const accessToken = accessTokenResponse?.token;
  if (!accessToken) {
    throw new Error("Failed to refresh YouTube access token");
  }
  client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  return {
    youtube: google.youtube({ version: "v3", auth: client }),
    analytics: google.youtubeAnalytics({ version: "v2", auth: client }),
  };
};

export async function LongLivedYouTubeAccessToken(
  refreshToken: string,
): Promise<{ access_token: string; expires_in: number }> {
  try {
    const tokenUrl = "https://oauth2.googleapis.com/token";

    const params = new URLSearchParams({
      client_id: YT_CLIENT_ID,
      client_secret: YT_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    });

    const { data } = await axios.post(tokenUrl, params);

    return {
      access_token: data.access_token,
      expires_in: data.expires_in, // usually 3600 seconds (1 hour)
    };
  } catch (error: any) {
    console.error(
      "Failed to refresh YouTube access token:",
      error.response?.data || error.message,
    );
    throw new Error("Unable to refresh YouTube access token");
  }
}

/**
 * Resolve schedule time into ISO string acceptable by YouTube's `status.publishAt`.
 * Supports:
 * - `scheduleAt`, `publishAt`, `scheduledAt`, `scheduled_publish_time`
 * - numeric seconds or milliseconds since epoch
 * - `scheduleDate` + `scheduleTime` (HH:mm) with optional `tzOffsetMinutes`
 * Returns `{ iso, error }` where `iso` is valid future time or null.
 */
export const resolveYouTubePublishAt = (
  body: any,
): { iso: string | null; error?: string } => {
  try {
    if (!body) return { iso: null };
    const raw =
      body.publishAt ??
      body.scheduleAt ??
      body.scheduledAt ??
      body.scheduled_publish_time ??
      null;

    let iso: string | null = null;

    if (raw == null) {
      if (body.scheduleDate && body.scheduleTime) {
        const base = new Date(`${body.scheduleDate}T${body.scheduleTime}:00Z`);
        if (!isNaN(base.getTime())) {
          const offset = Number(body.tzOffsetMinutes);
          if (!Number.isNaN(offset)) {
            const adjusted = new Date(base.getTime() - offset * 60000);
            iso = adjusted.toISOString();
          } else {
            iso = base.toISOString();
          }
        }
      }
    } else {
      // Numbers (ms or seconds)
      const num = Number(raw);
      if (!Number.isNaN(num)) {
        const millis = num > 1e12 ? num : num * 1000;
        const d = new Date(millis);
        if (!isNaN(d.getTime())) iso = d.toISOString();
      } else {
        // Strings (ISO or date-like)
        const d = new Date(String(raw));
        if (!isNaN(d.getTime())) iso = d.toISOString();
      }
    }

    if (!iso) return { iso: null };

    // Basic future validation (at least 60 seconds ahead)
    const when = new Date(iso).getTime();
    const nowPlus = Date.now() + 60_000;
    if (when <= nowPlus) {
      return {
        iso: null,
        error: "scheduleAt must be at least 60 seconds in the future",
      };
    }

    return { iso };
  } catch (e: any) {
    return { iso: null, error: e?.message || "Failed to parse schedule time" };
  }
};
