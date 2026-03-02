import axios from "axios";
import { getInstagramProfile, getSinglePostAnalyticsService } from "./instagram.service";

export async function buildInstagramDashboardBuilder(
  igUserId: string,
  accessToken: string
) {
  // 1. Fetch Profile (Overview & Audience data)
  const profileParams = {
    fields: "id,username,name,account_type,profile_picture_url,followers_count,follows_count,media_count",
    access_token: accessToken,
  };
  const profileUrl = `https://graph.instagram.com/me`; // Can also use v18.0/${igUserId}
  let profileData: any = {};
  try {
    const { data } = await axios.get(profileUrl, { params: profileParams });
    profileData = data;
  } catch (err) {
    console.error("Failed to fetch IG Profile for dashboard:", err);
  }

  // 2. Fetch Media Content (Posts)
  const mediaParams = {
    fields: "id,media_type,media_product_type,media_url,permalink,timestamp,caption,like_count,comments_count,children{media_url,media_type}",
    access_token: accessToken,
    limit: 50, // Get recent 50 posts
  };
  const mediaUrl = `https://graph.instagram.com/me/media`; // Can also use v18.0/${igUserId}/media
  let publishedContent: any[] = [];
  try {
    const { data } = await axios.get(mediaUrl, { params: mediaParams });
    const rawMedia = data.data || [];
    
    // Fetch insights for each post in parallel
    publishedContent = await Promise.all(rawMedia.map(async (post: any) => {
      let mediaUrls: string[] = [];
      if (post.media_type === "CAROUSEL_ALBUM" && post.children?.data) {
        mediaUrls = post.children.data
          .map((child: any) => child.media_url)
          .filter(Boolean);
      } else if (post.media_url) {
        mediaUrls.push(post.media_url);
      }

      let insights = [];
      try {
        console.log("Fetching analytics for post ID:", post.id);
        const analytics = await getSinglePostAnalyticsService(post.id, accessToken);
        insights = analytics.insights || [];
      } catch (e) {
        console.warn(`Failed to fetch insights for post ${post.id}:`, e);
      }

      return {
        id: post.id,
        media_type: post.media_type,
        media_product_type: post.media_product_type || "",
        media_url: post.media_url,
        media_urls: mediaUrls,
        permalink: post.permalink,
        timestamp: post.timestamp,
        caption: post.caption,
        like_count: post.like_count,
        comments_count: post.comments_count,
        insights: insights
      };
    }));
  } catch (err) {
    console.error("Failed to fetch IG Media for dashboard:", err);
  }

  // 3. Prepare Insights Data Structure
  let insightsData = {
    views: {
      total: 0,
      followersPercentage: 0,
      nonFollowersPercentage: 0,
    },
    accountsReached: 0,
    reachByContentType: {
      posts: 0,
      stories: 0,
      reels: 0,
    },
    interactions: {
      total: 0,
      followersPercentage: 0,
      nonFollowersPercentage: 0,
    },
    interactionsByContentType: {
      posts: 0,
      reels: 0,
      stories: 0,
    },
    profileActivity: {
      profileVisits: 0,
      externalLinkTaps: 0,
    },
    responsiveness: {
      dailyResponseRate: "--",
      dailyResponseTime: "--",
    },
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
    let postsInteractions = 0;
    let reelsInteractions = 0;
    
    let postsCount = 0;
    let reelsCount = 0;

    const sortedByInteractions = [...publishedContent].sort((a, b) => {
      // Prioritize using 'total_interactions' from insights for sorting
      const getInter = (post: any) => {
         let val = (post.like_count || 0) + (post.comments_count || 0);
         if (post.insights && Array.isArray(post.insights)) {
            const meta = post.insights.find((i: any) => i.name === 'total_interactions');
            if (meta?.values?.[0]?.value) val = meta.values[0].value;
         }
         return val;
      };
      return getInter(b) - getInter(a);
    });

    sortedByInteractions.forEach(post => {
      let interactions = (post.like_count || 0) + (post.comments_count || 0);
      
      // Use detailed interactions from insights if available
      if (post.insights && Array.isArray(post.insights)) {
        const totalInterObj = post.insights.find((i: any) => i.name === 'total_interactions');
        if (totalInterObj?.values?.[0]?.value) {
            interactions = totalInterObj.values[0].value;
        }
      }

      totalInteractions += interactions;
      
      // Determine if Reel or Post
      // In IG Graph API: media_product_type === 'REELS' or media_type === 'VIDEO'
      if (post.media_product_type === "REELS" || post.media_type === "VIDEO") {
        reelsInteractions += interactions;
        reelsCount++;
      } else {
        postsInteractions += interactions;
        postsCount++;
      }
    });

    // Populate interactions data
    insightsData.interactions.total = totalInteractions;
    
    // Calculate percentages for content type (avoiding division by zero)
    if (totalInteractions > 0) {
       insightsData.interactionsByContentType.posts = Number(((postsInteractions / totalInteractions) * 100).toFixed(1));
       insightsData.interactionsByContentType.reels = Number(((reelsInteractions / totalInteractions) * 100).toFixed(1));
    }

    // Set reach defaults based on content count as a fallback
    if (publishedContent.length > 0) {
      const totalContent = postsCount + reelsCount;
      insightsData.reachByContentType.posts = Number(((postsCount / totalContent) * 100).toFixed(1));
      insightsData.reachByContentType.reels = Number(((reelsCount / totalContent) * 100).toFixed(1));
    }

    insightsData.topContentByInteractions = sortedByInteractions.slice(0, 5);
    insightsData.topContentByViews = sortedByInteractions.slice(0, 5);
    
    // Attempt to fetch 30-day native insights
    const insightsUrl = `https://graph.instagram.com/${igUserId}/insights`;
    const insightsParams = {
      metric: "impressions,reach,profile_views",
      period: "day", // day, week, month, lifetime depending on API version
      access_token: accessToken,
    };
    
    try {
      const { data: insightsRes } = await axios.get(insightsUrl, { params: insightsParams });
      if (insightsRes && insightsRes.data) {
        
        let totalReach = 0;
        let totalViews = 0;
        let totalProfileVisits = 0;

        // Sum up the last 30 days if it returns a 'day' array, or just use the immediate value
        insightsRes.data.forEach((metric: any) => {
          let sum = 0;
          if (Array.isArray(metric.values)) {
            // Take up to 30 days of values if available
            metric.values.slice(0, 30).forEach((val: any) => sum += (val.value || 0));
          } else {
             // Fallback if not an array
             sum = metric.value || 0;
          }

          if (metric.name === "reach") totalReach = sum;
          if (metric.name === "profile_views") totalProfileVisits = sum;
          if (metric.name === "impressions") totalViews = sum;
        });

        if (totalReach > 0) insightsData.accountsReached = totalReach;
        if (totalProfileVisits > 0) insightsData.profileActivity.profileVisits = totalProfileVisits;
        if (totalViews > 0) insightsData.views.total = totalViews;
      }
    } catch (apiErr: any) {
      console.log("Not able to fetch advanced IG insights natively, using computed basic data.");
      // Just failing gracefully. We already populated basic interactions above.
      console.log("IG API Insights Err:", apiErr?.response?.data || apiErr?.message);
    }
  } catch (err) {
    console.error("Failed to build insights data structure calculations:", err);
  }

  let demographicsData: any = {};
  
  // Attempt to fetch Audience Demographics (requires lifetime period)
  try {
    const demoUrl = `https://graph.instagram.com/${igUserId}/insights`;
    
    // First try the older metrics that still apply to many graph tokens
    let demoParams: any = {
      metric: "audience_city,audience_country,audience_gender_age",
      period: "lifetime",
      access_token: accessToken,
    };
    
    let fetchedDemo = false;

    try {
      const { data: demoRes } = await axios.get(demoUrl, { params: demoParams });
      if (demoRes && demoRes.data) {
        fetchedDemo = true;
        demoRes.data.forEach((metric: any) => {
          if (metric.values && metric.values.length > 0) {
             demographicsData[metric.name] = metric.values[0].value || {};
          }
        });
      }
    } catch (oldDemoErr) {
       // Ignore, we will try the modern endpoint
    }

    if (!fetchedDemo) {
      // Modern Creator/Business Metric syntax
      demoParams = {
        metric: "follower_demographics",
        period: "lifetime",     
        timeframe: "last_30_days",
        breakdown: "age,gender,city,country",
        access_token: accessToken,
      };

      const { data: modernDemoRes } = await axios.get(demoUrl, { params: demoParams });
      if (modernDemoRes && modernDemoRes.data) {
        modernDemoRes.data.forEach((metric: any) => {
          // Flatten modern demographics if available
          if (metric.total_value && metric.total_value.breakdowns) {
            metric.total_value.breakdowns.forEach((breakdown: any) => {
               const breakdownName = breakdown.dimension_keys?.join("_") || "distribution";
               const mappedValues: any = {};
               breakdown.results?.forEach((res: any) => {
                 const key = res.dimension_values?.join("-") || "unknown";
                 mappedValues[key] = res.value;
               });
               demographicsData[`follower_demographics_${breakdownName}`] = mappedValues;
            });
          } else if (metric.values && metric.values.length > 0) {
             demographicsData[metric.name] = metric.values[0].value || {};
          }
        });
      }
    }
  } catch (demoErr: any) {
    console.log("Not able to fetch advanced IG audience demographics natively.");
    console.log("IG API Demographics Err:", demoErr?.response?.data || demoErr?.message);
  }

  return {
    overview: {
      id: profileData.id || "",
      username: profileData.username || "",
      name: profileData.name || "",
      account_type: profileData.account_type || "",
      profile_picture_url: profileData.profile_picture_url || "",
      followersCount: profileData.followers_count || 0,
      followsCount: profileData.follows_count || 0,
      mediaCount: profileData.media_count || 0,
    },
    content: {
      publishedContent,
    },
    audience: {
      followers: profileData.followers_count || 0,
      demographics: demographicsData,
    },
    insights: insightsData,
  };
}
