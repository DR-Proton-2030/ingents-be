import axios from "axios";
import dotenv from "dotenv";
import UserModel from "../../models/users/users.model";

dotenv.config();

const YT_CLIENT_ID = process.env.YT_CLIENT_ID!;
const YT_CLIENT_SECRET = process.env.YT_CLIENT_SECRET!;
const YT_REDIRECT_URI = process.env.YT_REDIRECT_URI!;

export async function LongLivedYouTubeAccessToken(
  refreshToken: string
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
      error.response?.data || error.message
    );
    throw new Error("Unable to refresh YouTube access token");
  }
}
