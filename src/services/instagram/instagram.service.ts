import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const INSTAGRAM_CLIENT_ID = process.env.INSTAGRAM_CLIENT_ID!;
const INSTAGRAM_CLIENT_SECRET = process.env.INSTAGRAM_CLIENT_SECRET!;
const REDIRECT_URI = process.env.INSTAGRAM_REDIRECT_URI!;

export const getInstagramAuthURL = (userId: string) => {
  const authUrl = `https://www.instagram.com/oauth/authorize?force_reauth=true&client_id=${INSTAGRAM_CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=instagram_business_basic%2Cinstagram_business_manage_messages%2Cinstagram_business_manage_comments%2Cinstagram_business_content_publish%2Cinstagram_business_manage_insights`;

  return authUrl;
};

export const getInstagramUser = async (code: string) => {
  console.log("called");
  const tokenUrl = `https://graph.facebook.com/v20.0/oauth/access_token`;
  console.log(code);
  const params = new URLSearchParams({
    client_id: INSTAGRAM_CLIENT_ID,
    client_secret: INSTAGRAM_CLIENT_SECRET,
    redirect_uri: REDIRECT_URI,
    code,
  }).toString();

  const { data } = await axios.get(`${tokenUrl}?${params}`);
  const accessToken = data.access_token;
  console.log("Insta access_token : ", accessToken);
  // Fetch user details
  //   const userResponse = await axios.get(
  //     `https://graph.facebook.com/me?fields=id,name,email&access_token=${accessToken}`
  //   );
  //   console.log(userResponse);
  return {
    tokens: {
      access_token: accessToken,
    },
    // user: userResponse.data,
  };
};
