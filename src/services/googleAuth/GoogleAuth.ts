
import { google } from "googleapis";
import {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  REDIRECT_URI
} from "../../config/config";
import AuthTokenModel from "../../models/authToken/authToken.model";

const oauth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  REDIRECT_URI,
);

export const SCOPES = ["https://www.googleapis.com/auth/calendar"];

export const getAuthorizedGoogleClient = async (company_object_id : string) => {
  const saved = await AuthTokenModel.findOne({ company_object_id });

  if(!saved) {
    throw new Error("No Google auth token found for the company");
  }
  const { access_token, refresh_token, expiry_date } = saved.google;

  oauth2Client.setCredentials({
    access_token,
    refresh_token,
    expiry_date
  });

  // If expired → auto refresh
  const now = Date.now();
  if (expiry_date <= now) {
    const { credentials } = await oauth2Client.refreshAccessToken();

    await AuthTokenModel.updateOne(
      { company_object_id },
      {
        google:{
            access_token: credentials.access_token,
            refresh_token: credentials.refresh_token,
            expiry_date: new Date(credentials.expiry_date || 0).getTime(),
        }
      }
    );

    oauth2Client.setCredentials(credentials);
  }

  return oauth2Client;
}