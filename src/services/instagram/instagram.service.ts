import axios from "axios";
import dotenv from "dotenv";
import { InstagramPostParams } from "../../types/interface/instagramService.interface";

dotenv.config({ override: true });

const INSTAGRAM_CLIENT_ID = process.env.INSTAGRAM_CLIENT_ID!;
const INSTAGRAM_CLIENT_SECRET = process.env.INSTAGRAM_CLIENT_SECRET!;
const REDIRECT_URI = process.env.INSTAGRAM_REDIRECT_URI!;

export const getInstagramAuthURL = (userId: string) => {
  const redirectUriEncoded = encodeURIComponent(REDIRECT_URI);
  const stateEncoded = btoa(userId); // encode userId to base64

  return `https://www.instagram.com/oauth/authorize?force_reauth=true&client_id=${INSTAGRAM_CLIENT_ID}&redirect_uri=${redirectUriEncoded}&response_type=code&scope=instagram_business_basic%2Cinstagram_business_manage_messages%2Cinstagram_business_manage_comments%2Cinstagram_business_content_publish%2Cinstagram_business_manage_insights&state=${stateEncoded}`;
};

export const getInstagramUser = async (code: string) => {
  console.log("Called with code:", code);

  const tokenUrl = `https://api.instagram.com/oauth/access_token`;

  try {
    const { data } = await axios.post(
      tokenUrl,
      new URLSearchParams({
        client_id: INSTAGRAM_CLIENT_ID,
        client_secret: INSTAGRAM_CLIENT_SECRET,
        grant_type: "authorization_code",
        redirect_uri: REDIRECT_URI,
        code,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const accessToken = data.access_token;
    console.log("Instagram access_token:", accessToken);

    // Optionally fetch user details using Graph API
    // const userResponse = await axios.get(
    //   `https://graph.facebook.com/me?fields=id,username&access_token=${accessToken}`
    // );
    // console.log("User info:", userResponse.data);

    return {
      tokens: {
        access_token: accessToken,
      },
      // user: userResponse.data,
    };
  } catch (error: any) {
    console.error(
      "Error fetching Instagram token:",
      error.response?.data || error.message
    );
    throw error;
  }
};

export const getInstagramProfile = async (accessToken: string) => {
  try {
    const url = `https://graph.instagram.com/me`;
    const params = {
      fields: "id,username,name,account_type,profile_picture_url,followers_count,follows_count,media_count",
      access_token: accessToken,
    };

    const { data } = await axios.get(url, { params });

    return data;
  } catch (error: any) {
    console.error(
      "Error fetching Instagram profile:",
      error.response?.data || error.message
    );
    throw new Error("Failed to fetch Instagram profile");
  }
};

// Get Long Lived Token
export const getInstagramLongLivedToken = async (shortLivedToken: string) => {
  try {
    const url = "https://graph.instagram.com/access_token";

    const params = {
      grant_type: "ig_exchange_token",
      client_secret: INSTAGRAM_CLIENT_SECRET,
      access_token: shortLivedToken,
    };

    const { data } = await axios.get(url, { params });

    return {
      access_token: data.access_token,
      token_type: data.token_type,
      expires_in: data.expires_in,
    };
  } catch (error: any) {
    console.error(
      "Error exchanging long-lived token:",
      error.response?.data || error.message
    );
    throw new Error("Failed to get long-lived Instagram token");
  }
};

export const createInstagramMedia = async ({
  accessToken,
  igUserId,
  imageUrl,
  videoUrl,
  caption,
  mediaType = "IMAGE",
}: InstagramPostParams) => {
  if (!imageUrl && !videoUrl) {
    throw new Error("imageUrl or videoUrl is required to create a media container");
  }

  try {
    const url = `https://graph.instagram.com/v18.0/${igUserId}/media`;
    const body: any = {
      caption,
      media_type: mediaType,
    };
    if (mediaType === "VIDEO" || mediaType === "REELS") {
      body.video_url = videoUrl || imageUrl;
    } else {
      body.image_url = imageUrl;
    }

    const { data } = await axios.post(url, body, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    // Returns the container ID
    return data;
  } catch (error: any) {
    console.error(
      "Error creating Instagram media:",
      error.response?.data || error.message
    );
    throw new Error("Failed to create Instagram media");
  }
};

export const getInstagramMediaStatus = async ({
  accessToken,
  containerId,
}: {
  accessToken: string;
  containerId: string;
}) => {
  try {
    const url = `https://graph.instagram.com/v18.0/${containerId}`;
    const { data } = await axios.get(url, {
      params: {
        fields: "status_code",
        access_token: accessToken,
      },
    });
    return data;
  } catch (error: any) {
    console.error(
      "Error fetching Instagram media status:",
      error.response?.data || error.message
    );
    throw new Error("Failed to fetch Instagram media status");
  }
};

export const publishInstagramMedia = async ({
  accessToken,
  igUserId,
  containerId,
}: {
  accessToken: string;
  igUserId: string;
  containerId: string;
}) => {
  try {
    const url = `https://graph.instagram.com/v18.0/${igUserId}/media_publish`;
    const body = {
      creation_id: containerId,
    };

    const { data } = await axios.post(url, body, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    return data; // Returns the published post ID
  } catch (error: any) {
    console.error(
      "Error publishing Instagram media:",
      error.response?.data || error.message
    );
    throw new Error("Failed to publish Instagram media");
  }
};
