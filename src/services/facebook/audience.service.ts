import { getPageInsights } from "./insights/pageInsights";
import { getVideoInsights } from "./insights/videoInsights";

export type DateWindow = { sinceISO: string; untilISO: string };

export async function getFollowersVsNonFollowersViews(
  videoIds: string[],
  accessToken: string,
) {
  let followerViews = 0;
  let nonFollowerViews = 0;
  for (const vid of videoIds) {
    const ins = await getVideoInsights(vid, accessToken, [
      "total_video_views_follower",
      "total_video_views_non_follower",
    ]);
    followerViews +=
      ins.find((i) => i.name === "total_video_views_follower")?.values?.[0]
        ?.value || 0;
    nonFollowerViews +=
      ins.find((i) => i.name === "total_video_views_non_follower")?.values?.[0]
        ?.value || 0;
  }
  const unavailable = !(followerViews || nonFollowerViews);
  return {
    watchTimeSplitUnavailable: unavailable,
    watchTimeSplit: [
      { label: "Followers", value: followerViews },
      { label: "Non-followers", value: nonFollowerViews },
    ],
  };
}

export async function getDemographics(pageId: string, accessToken: string) {
  // Lifetime demographics; may be unavailable depending on page/app
  const genderAge = await getPageInsights(
    pageId,
    accessToken,
    ["page_fans_gender_age"],
    undefined,
    undefined,
    "lifetime",
  );
  const country = await getPageInsights(
    pageId,
    accessToken,
    ["page_fans_country"],
    undefined,
    undefined,
    "lifetime",
  );
  const city = await getPageInsights(
    pageId,
    accessToken,
    ["page_fans_city"],
    undefined,
    undefined,
    "lifetime",
  );

  // Values for demographic metrics are key-value maps on the last value entry
  const gaValues = (genderAge[0]?.values || []).slice(-1)[0]?.value || {};
  const countryValues = (country[0]?.values || []).slice(-1)[0]?.value || {};
  const cityValues = (city[0]?.values || []).slice(-1)[0]?.value || {};

  // Transform maps into arrays consumable by frontend
  const ageGender = Object.entries(gaValues).map(([k, v]) => ({
    label: k,
    value: Number(v) || 0,
  }));
  const countries = Object.entries(countryValues).map(([k, v]) => ({
    label: k,
    value: Number(v) || 0,
  }));
  const cities = Object.entries(cityValues).map(([k, v]) => ({
    label: k,
    value: Number(v) || 0,
  }));

  return {
    ageGender,
    countries,
    cities,
  };
}
