import axios from "axios";
import crypto from "crypto";
import dotenv from "dotenv";
import UserModel from "../../models/users/users.model";

dotenv.config();

const X_OAUTH_AUTHORIZE = "https://twitter.com/i/oauth2/authorize";
const X_OAUTH_TOKEN = "https://api.twitter.com/2/oauth2/token";

function base64url(input: Buffer) {
  return input
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function generatePKCE() {
  const verifier = base64url(crypto.randomBytes(32));
  const challenge = base64url(
    crypto.createHash("sha256").update(verifier).digest(),
  );
  return { verifier, challenge, method: "S256" } as const;
}

export const getXAuthURL = async (userId: string) => {
  const clientId = process.env.X_CLIENT_ID;
  const redirectUri = process.env.X_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    console.error("Missing X env vars:", { clientId, redirectUri });
    throw new Error("X_CLIENT_ID or X_REDIRECT_URI is missing in .env");
  }

  const { verifier, challenge, method } = generatePKCE();
  // Store verifier for callback
  await UserModel.findByIdAndUpdate(userId, {
    $set: { "x.pkce_verifier": verifier },
  });

  const state = Buffer.from(userId).toString("base64");
  const scope = [
    "tweet.read",
    "tweet.write",
    "users.read",
    "offline.access",
  ].join(" ");

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope,
    state,
    code_challenge: challenge,
    code_challenge_method: method,
  }).toString();

  return `${X_OAUTH_AUTHORIZE}?${params}`;
};

export const exchangeCodeForTokens = async (code: string, userId: string) => {
  const clientId = process.env.X_CLIENT_ID!;
  const clientSecret = process.env.X_CLIENT_SECRET;
  const redirectUri = process.env.X_REDIRECT_URI!;

  const user = await UserModel.findById(userId);
  const verifier = user?.x?.pkce_verifier;
  if (!verifier) {
    throw new Error("Missing PKCE verifier for user");
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    redirect_uri: redirectUri,
    code_verifier: verifier,
    code,
  }).toString();

  const headers: any = { "Content-Type": "application/x-www-form-urlencoded" };
  if (clientSecret) {
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString(
      "base64",
    );
    headers["Authorization"] = `Basic ${basic}`;
  }

  const resp = await axios.post(X_OAUTH_TOKEN, body, { headers });
  const tokens = resp.data;

  await UserModel.findByIdAndUpdate(userId, {
    $set: {
      "x.access_token": tokens.access_token,
      "x.refresh_token": tokens.refresh_token,
      "x.pkce_verifier": null,
    },
  });

  return tokens;
};

export const refreshXToken = async (userId: string) => {
  const clientId = process.env.X_CLIENT_ID!;
  const clientSecret = process.env.X_CLIENT_SECRET;

  const user = await UserModel.findById(userId);
  const refresh_token = user?.x?.refresh_token;
  if (!refresh_token) throw new Error("Missing refresh token");

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: clientId,
    refresh_token,
  }).toString();

  const headers: any = { "Content-Type": "application/x-www-form-urlencoded" };
  if (clientSecret) {
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString(
      "base64",
    );
    headers["Authorization"] = `Basic ${basic}`;
  }

  const resp = await axios.post(X_OAUTH_TOKEN, body, { headers });
  const tokens = resp.data;
  await UserModel.findByIdAndUpdate(userId, {
    $set: {
      "x.access_token": tokens.access_token,
      "x.refresh_token": tokens.refresh_token || refresh_token,
    },
  });
  return tokens;
};

export const getXUserProfile = async (accessToken: string) => {
  const { data } = await axios.get(
    "https://api.twitter.com/2/users/me?user.fields=profile_image_url,public_metrics,description,location,created_at,url,verified",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
  return data.data;
};
