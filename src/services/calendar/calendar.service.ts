import { google } from "googleapis";
import { getAuthorizedGoogleClient } from "../googleAuth/GoogleAuth";

export const getCalendarEvents = async (company_object_id: string) => {
  try {
    const authClient = await getAuthorizedGoogleClient(company_object_id);

    const calendar = google.calendar({
      version: "v3",
      auth: authClient,
    });

    const events = await calendar.events.list({
      calendarId: "primary",
      maxResults: 100,
    });
  } catch (error) {}
};
