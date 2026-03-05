import axios from "axios";
import { getSinglePostAnalyticsService } from "./instagram.service";
const BASE_URL = "https://graph.facebook.com/v22.0";

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
        const meta = post.insights?.find(
          (i: any) => i.name === "total_interactions"
        );
        if (meta?.values?.[0]?.value) val = meta.values[0].value;
        return val;
      };
      return getInter(b) - getInter(a);
    });

    sortedByInteractions.forEach((post) => {
      let interactions = (post.like_count || 0) + (post.comments_count || 0);
      const totalInterObj = post.insights?.find(
        (i: any) => i.name === "total_interactions"
      );
      if (totalInterObj?.values?.[0]?.value)
        interactions = totalInterObj.values[0].value;
      totalInteractions += interactions;
    });

    insightsData.interactions.total = totalInteractions;
    insightsData.topContentByInteractions = sortedByInteractions.slice(0, 5);
    
    const sortedByViews = [...publishedContent].sort((a, b) => {
      const getViews = (post: any) => {
        const viewsObj = post.insights?.find(
          (i: any) => i.name === "views" || i.name === "impressions"
        );
        return viewsObj?.values?.[0]?.value || 0;
      };
      return getViews(b) - getViews(a);
    });
    insightsData.topContentByViews = sortedByViews.slice(0, 5);
  } catch (err) {
    console.error("[DashboardBuilder] Failed to build content insights:", err);
  }

  // 4. Fetch Account Insights (Day period)
  let combinedInsights: any[] = [];
  try {
    const [totalsRes, breakdownMediaRes, breakdownFollowRes, seriesRes] = await Promise.all([
      // A. Totals
      axios.get(`${BASE_URL}/${igUserId}/insights`, {
        params: {
          metric: "views,reach,profile_views,total_interactions",
          period: "day",
          metric_type: "total_value",
          access_token: accessToken,
        },
      }).catch(() => ({ data: { data: [] } })),
      // B. Media Type Breakdown
      axios.get(`${BASE_URL}/${igUserId}/insights`, {
        params: {
          metric: "views,reach,total_interactions",
          period: "day",
          metric_type: "total_value",
          breakdown: "media_product_type",
          access_token: accessToken,
        },
      }).catch(() => ({ data: { data: [] } })),
      // C. Follow Type Breakdown
      axios.get(`${BASE_URL}/${igUserId}/insights`, {
        params: {
          metric: "views,reach,total_interactions",
          period: "day",
          metric_type: "total_value",
          breakdown: "follow_type",
          access_token: accessToken,
        },
      }).catch(() => ({ data: { data: [] } })),
      // D. Time-series only
      axios.get(`${BASE_URL}/${igUserId}/insights`, {
        params: {
          metric: "follower_count",
          period: "day",
          access_token: accessToken,
        },
      }).catch(() => ({ data: { data: [] } }))
    ]);

    combinedInsights = [
      ...(totalsRes.data?.data || []),
      ...(seriesRes.data?.data || []),
    ];

    // Helper to extract breakdown value
    const getBreakdownVal = (metricData: any, dimensionValue: string) => {
      const breakdown = metricData?.total_value?.breakdowns?.[0];
      if (!breakdown) return 0;
      const result = breakdown.results?.find((r: any) => 
        r.dimension_values?.includes(dimensionValue) || 
        Object.values(r.dimension_values || {}).includes(dimensionValue)
      );
      return result?.value || 0;
    };

    // Process Totals
    if (totalsRes.data?.data) {
      totalsRes.data.data.forEach((metric: any) => {
        const sum = metric.total_value?.value || 0;
        if (metric.name === "reach") insightsData.accountsReached = sum;
        if (metric.name === "profile_views") insightsData.profileActivity.profileVisits = sum;
        if (metric.name === "views") insightsData.views.total = sum;
        if (metric.name === "total_interactions") insightsData.interactions.total = sum;
      });
    }

    // Process Media Type Breakdowns
    if (breakdownMediaRes.data?.data) {
      breakdownMediaRes.data.data.forEach((metric: any) => {
        const reels = getBreakdownVal(metric, "REELS");
        const stories = getBreakdownVal(metric, "STORY");
        const feed = getBreakdownVal(metric, "FEED");

        if (metric.name === "reach") {
          insightsData.reachByContentType.reels = reels;
          insightsData.reachByContentType.stories = stories;
          insightsData.reachByContentType.posts = feed;
        }
        if (metric.name === "total_interactions") {
          insightsData.interactionsByContentType.reels = reels;
          insightsData.interactionsByContentType.stories = stories;
          insightsData.interactionsByContentType.posts = feed;
        }
      });
    }

    // Process Follow Type Breakdowns (Percentages)
    if (breakdownFollowRes.data?.data) {
      breakdownFollowRes.data.data.forEach((metric: any) => {
        const followers = getBreakdownVal(metric, "FOLLOWER");
        const nonFollowers = getBreakdownVal(metric, "NON_FOLLOWER");
        const total = followers + nonFollowers;
        
        if (total > 0) {
          const fPerc = Math.round((followers / total) * 100);
          const nfPerc = 100 - fPerc;

          if (metric.name === "views") {
            insightsData.views.followersPercentage = fPerc;
            insightsData.views.nonFollowersPercentage = nfPerc;
          }
          if (metric.name === "total_interactions") {
            insightsData.interactions.followersPercentage = fPerc;
            insightsData.interactions.nonFollowersPercentage = nfPerc;
          }
        }
      });
    }
  } catch (err) {
    console.error("[DashboardBuilder] Failed to build account insights:", err);
  }

  // 5. Fetch Audience Demographics (Individual breakdowns for reliability)
  let demographicsData: any = {};
  try {
    const breakdownNames = ["city", "country", "gender", "age"];
    const demoResponses = await Promise.all(
      breakdownNames.map(b => 
        axios.get(`${BASE_URL}/${igUserId}/insights`, {
          params: {
            metric: "follower_demographics",
            period: "lifetime",
            metric_type: "total_value",
            breakdown: b,
            access_token: accessToken,
          },
        }).catch(err => {
          console.warn(`[DashboardBuilder] Demographic ${b} failed:`, err.response?.data || err.message);
          return { data: { data: [] } };
        })
      )
    );

    demoResponses.forEach((res, idx) => {
      const dimension = breakdownNames[idx];
      const items = res.data?.data || [];
      items.forEach((item: any) => {
        const results = item.total_value?.breakdowns?.[0]?.results;
        if (results) {
          if (!demographicsData[dimension]) demographicsData[dimension] = {};
          results.forEach((r: any) => {
            const label = Object.values(r.dimension_values || {})[0] as string;
            if (label) demographicsData[dimension][label] = r.value;
          });
        } else if (item.values?.[0]?.value) {
          // Fallback legacy structure
          demographicsData[dimension] = item.values[0].value;
        }
      });
    });

    console.log(`[DashboardBuilder] Final merged demographics for ${igUserId}:`, Object.keys(demographicsData));
  } catch (demoErr: any) {
    console.warn(
      `[DashboardBuilder] Audience metrics unavailable for ${igUserId}`
    );
  }

  // 6. Calculate Summary
  const summary: any = {};
  if (combinedInsights.length > 0) {
    combinedInsights.forEach((metric: any) => {
      let sum = 0;
      if (metric.total_value) {
        sum = metric.total_value.value || 0;
      } else if (Array.isArray(metric.values)) {
        sum = metric.values.reduce((acc: number, v: any) => acc + (v.value || 0), 0);
      }
      summary[metric.name] = sum;
    });
  }

  return {
    overview: {
      id: profileData.id || "",
      username: profileData.username || "",
      name: profileData.name || "",
      account_type: "BUSINESS",
      profile_picture_url: profileData.profile_picture_url || "",
      followersCount: profileData.followers_count || 0,
      followsCount: profileData.follows_count || 0,
      mediaCount: profileData.media_count || 0,
      views: summary.views || 0,
      reach: summary.reach || 0,
      profileViews: summary.profile_views || 0,
    },
    content: { publishedContent },
    audience: {
      followers: profileData.followers_count || 0,
      demographics: demographicsData,
    },
    insights: {
      ...insightsData,
      daily: combinedInsights,
    },
    summary,
  };
}
