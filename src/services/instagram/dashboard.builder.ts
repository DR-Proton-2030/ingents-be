import axios from "axios";
import { getSinglePostAnalyticsService } from "./instagram.service";
const BASE_URL = "https://graph.facebook.com/v20.0";

export async function buildInstagramDashboardBuilder(
  igUserId: string,
  accessToken: string
) {
  // 1. Fetch Profile (Overview)
  // GET /{ig-user-id}?fields=id,username,name,followers_count,follows_count,media_count,profile_picture_url
  const profileUrl = `${BASE_URL}/${igUserId}`;
  const profileParams = {
    fields: "id,username,name,followers_count,follows_count,media_count,profile_picture_url",
    access_token: accessToken,
  };

  let profileData: any = {};
  try {
    const { data } = await axios.get(profileUrl, { params: profileParams });
    profileData = data;
  } catch (err) {
    console.error(`[DashboardBuilder] Failed to fetch IG Profile for ${igUserId}:`, err);
  }

  // 2. Fetch Media Content (Posts)
  // GET /{ig-user-id}/media?fields=id,caption,media_type,media_product_type,media_url,permalink,timestamp,like_count,comments_count
  const mediaUrl = `${BASE_URL}/${igUserId}/media`;
  const mediaParams = {
    fields: "id,media_type,media_product_type,media_url,permalink,timestamp,caption,like_count,comments_count",
    access_token: accessToken,
    limit: 50,
  };

  let publishedContent: any[] = [];
  try {
    const { data: mediaListResponse } = await axios.get(mediaUrl, { params: mediaParams });
    const rawMedia = mediaListResponse.data || [];
    
    // Fetch insights for each post in parallel (Batch optimization)
    publishedContent = await Promise.all(rawMedia.map(async (post: any) => {
      let insights = [];
      try {
        const analytics = await getSinglePostAnalyticsService(post.id, accessToken);
        insights = analytics.insights || [];
      } catch (e) {
        console.warn(`[DashboardBuilder] Insights failed for post ${post.id}`);
      }

      return {
        id: post.id,
        media_type: post.media_type,
        media_product_type: post.media_product_type || "",
        media_url: post.media_url,
        permalink: post.permalink,
        timestamp: post.timestamp,
        caption: post.caption,
        like_count: post.like_count || 0,
        comments_count: post.comments_count || 0,
        insights
      };
    }));
  } catch (err) {
    console.error(`[DashboardBuilder] Failed to fetch IG Media list for ${igUserId}:`, err);
  }

  // 3. Prepare Insights Data Structure
  let insightsData = {
    views: { total: 0, followersPercentage: 0, nonFollowersPercentage: 0 },
    accountsReached: 0,
    reachByContentType: { posts: 0, stories: 0, reels: 0 },
    interactions: { total: 0, followersPercentage: 0, nonFollowersPercentage: 0 },
    interactionsByContentType: { posts: 0, reels: 0, stories: 0 },
    profileActivity: { profileVisits: 0, externalLinkTaps: 0 },
    responsiveness: { dailyResponseRate: "--", dailyResponseTime: "--" },
    conversations: {
      messagingConversationsStarted: 0,
      totalMessagingContacts: 0,
      newMessagingContacts: 0,
      returningMessagingContacts: 0,
    },
    topContentByViews: [] as any[],
    topContentByInteractions: [] as any[],
  };

  try {
    let totalInteractions = 0;
    const sortedByInteractions = [...publishedContent].sort((a, b) => {
      const getInter = (post: any) => {
          let val = (post.like_count || 0) + (post.comments_count || 0);
          const meta = post.insights?.find((i: any) => i.name === 'total_interactions');
          if (meta?.values?.[0]?.value) val = meta.values[0].value;
          return val;
      };
      return getInter(b) - getInter(a);
    });

    sortedByInteractions.forEach(post => {
      let interactions = (post.like_count || 0) + (post.comments_count || 0);
      const totalInterObj = post.insights?.find((i: any) => i.name === 'total_interactions');
      if (totalInterObj?.values?.[0]?.value) interactions = totalInterObj.values[0].value;
      totalInteractions += interactions;
    });

    insightsData.interactions.total = totalInteractions;
    insightsData.topContentByInteractions = sortedByInteractions.slice(0, 5);
    insightsData.topContentByViews = sortedByInteractions.slice(0, 5);
    
    // 4. Fetch Account Insights (Day period)
    const insightsRes = await axios.get(`${BASE_URL}/${igUserId}/insights`, {
      params: { metric: "impressions,reach,profile_views", period: "day", access_token: accessToken }
    }).catch(() => ({ data: { data: [] } }));

    if (insightsRes.data?.data) {
      insightsRes.data.data.forEach((metric: any) => {
        let sum = 0;
        if (Array.isArray(metric.values)) {
          metric.values.forEach((val: any) => sum += (val.value || 0));
        }
        if (metric.name === "reach") insightsData.accountsReached = sum;
        if (metric.name === "profile_views") insightsData.profileActivity.profileVisits = sum;
        if (metric.name === "impressions") insightsData.views.total = sum;
      });
    }
  } catch (err) {
    console.error("[DashboardBuilder] Failed to build business insights:", err);
  }

  // 5. Fetch Audience Demographics (Lifetime period)
  let demographicsData: any = {};
  const demoUrl = `${BASE_URL}/${igUserId}/insights`;
  try {
    const { data: demoRes } = await axios.get(demoUrl, {
      params: {
        metric: "audience_city,audience_country,audience_gender_age,audience_locale",
        period: "lifetime",
        access_token: accessToken,
      },
    });
    if (demoRes && demoRes.data) {
      demoRes.data.forEach((metric: any) => {
        if (metric.values && metric.values.length > 0) {
           demographicsData[metric.name] = metric.values[metric.values.length - 1].value || {};
        }
      });
    }
  } catch (demoErr: any) {
    console.warn(`[DashboardBuilder] Audience metrics unavailable for ${igUserId} (possibly <100 followers)`);
  }

  return {
    overview: {
      id: profileData.id || "",
      username: profileData.username || "",
      name: profileData.name || "",
      account_type: "BUSINESS", // Hardcoded as this is Business API
      profile_picture_url: profileData.profile_picture_url || "",
      followersCount: profileData.followers_count || 0,
      followsCount: profileData.follows_count || 0,
      mediaCount: profileData.media_count || 0,
    },
    content: { publishedContent },
    audience: {
      followers: profileData.followers_count || 0,
      demographics: demographicsData,
    },
    insights: insightsData,
  };
}
