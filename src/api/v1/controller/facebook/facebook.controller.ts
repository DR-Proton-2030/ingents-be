import { Request, Response } from "express";
import {
  getFacebookAuthURL,
  getFacebookUser,
  getLongLivedToken,
  getPageTokenService,
} from "../../../../services/facebook/facebook.service";
import axios from "axios";
import FormData from "form-data";
import { uploadFileToS3Service } from "../../../../services/uploadFile/uploadFile";
import UserModel from "../../../../models/users/users.model";
const FACEBOOK_GRAPH_URL = "https://graph.facebook.com/v20.0";

export const facebookLogin = (req: Request, res: Response) => {
  const { user_id } = req.query;
  console.log("=====>userId", user_id);

  console.log("user_id", user_id);
  if (!user_id) return res.status(400).json({ error: "Client ID is required" });
  const authUrl = getFacebookAuthURL(user_id as string);
  res.redirect(authUrl);
};

export const facebookAuthCallback = async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query;

    console.log("===>called state", state);
    console.log("Facebook callback code and state : ", code, state);
    if (!code) return res.status(400).json({ error: "No code provided" });

    // Exchange code for access token & user data
    const { tokens, user } = await getFacebookUser(code as string);

    console.log("====>state : ", state);
    const userId = atob(state as string);
    // Redirect to frontend with token & pages as query params
    res.redirect(
      `${process.env.FRONTEND_URL}/dashboard/social-media?platform=facebook&token=${
        tokens.access_token
      }&user=${encodeURIComponent(JSON.stringify(user))}&user_id=${userId}`,
    );
  } catch (error) {
    console.error("OAuth authentication failed:", error);
    res.status(500).json({ error: "OAuth authentication failed" });
  }
};

/**
 * Fetch Facebook Pages
 */
export const fetchFacebookPages = async (req: Request, res: Response) => {
  try {
    console.log("fetchFacebookPages called");
    const userAccessToken = req.headers.authorization?.split("Bearer ")[1];
    const userId = req.query.userId as string;
    console.log("===========>", userId);
    if (!userAccessToken) {
      return res
        .status(401)
        .json({ error: "Unauthorized - Missing Facebook Token" });
    }
    if (!userId) {
      return res.status(400).json({ error: "Missing userId in query" });
    }

    // Get long-lived token
    const longTokenResponse = await getLongLivedToken(userAccessToken);
    const longLivedToken = longTokenResponse?.access_token || longTokenResponse;

    //  Save token & fetch pages in parallel
    const [savedUser, pagesResponse] = await Promise.all([
      UserModel.findByIdAndUpdate(
        userId,
        { $set: { "facebook.access_token": longLivedToken } },
        { new: true },
      ),
      axios.get(
        `https://graph.facebook.com/v18.0/me/accounts?fields=id,name,access_token&access_token=${longLivedToken}`,
      ),
    ]);

    console.log("Saved user token : ", savedUser);
    return res.json({
      message: "Token saved and pages fetched successfully",
      user: savedUser,
      result: pagesResponse.data.data,
    });
  } catch (error: any) {
    console.error(
      "Error saving token or fetching pages:",
      error.response?.data || error.message,
    );
    return res.status(500).json({
      error: "Failed to save token or fetch pages",
      details: error.response?.data || error.message,
    });
  }
};

// Get long Live Access Token
export const getAccessTokenLongTerm = async (req: Request, res: Response) => {
  try {
    const userPayload = req.body;
    const AccessToken = req.headers.authorization?.split("Bearer ")[1];
    if (!AccessToken) {
      return res
        .status(401)
        .json({ error: "Unauthorized - Missing Facebook Token" });
    }

    const response = await getLongLivedToken(AccessToken);

    if (req.query.user_id) {
      await UserModel.findByIdAndUpdate(
        { _id: req.query.user_id },
        { $set: userPayload },
        { new: true },
      );
    }

    console.log("Long Lived token response : ", response);

    res.status(200).json({
      success: true,
      message: "Successfully get access token",
      token: response,
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Internal server error!...",
    });
  }
};

// Universal Facebook post: text, image, or video
export const postFacebookUniversal = async (req: Request, res: Response) => {
  try {
    const { userId, pageId, message, imageUrl, videoURL } = req.body;
    const uploadedImage = (req as any).files?.image?.[0];
    const uploadedVideo = (req as any).files?.video?.[0];

    if (!userId || !pageId) {
      return res.status(400).json({ error: "userId and pageId are required" });
    }

    // Get page access token
    const { pageAccessToken, id } = await getPageTokenService(userId, pageId);

    // Priority: if message only, post text; if image present (file or url), post image; if video present, post video
    if (message && !uploadedImage && !uploadedVideo && !imageUrl && !videoURL) {
      // Text only
      const postRes = await axios.post(`${FACEBOOK_GRAPH_URL}/${id}/feed`, {
        message,
        access_token: pageAccessToken,
      });
      return res.status(200).json({
        success: true,
        postId: postRes.data.id,
        message: "Text posted",
      });
    }

    // If image file uploaded -> upload to S3, save to user, post via URL
    if (uploadedImage || imageUrl) {
      let finalImageUrl = imageUrl;
      if (uploadedImage) {
        finalImageUrl = await uploadFileToS3Service(
          `facebook_uploads/${userId}`,
          uploadedImage.buffer,
          uploadedImage.mimetype || "image/jpeg",
        );
        try {
          await UserModel.findByIdAndUpdate(userId, {
            $set: { "facebook.last_uploaded_image": finalImageUrl },
          });
        } catch (dbErr) {
          console.warn("Failed to save image URL:", dbErr);
        }
      }

      const imgRes = await axios.post(`${FACEBOOK_GRAPH_URL}/${id}/photos`, {
        url: finalImageUrl,
        caption: message || "",
        access_token: pageAccessToken,
      });
      return res.status(200).json({
        success: true,
        postId: imgRes.data.id,
        message: "Image posted",
      });
    }

    // If video file uploaded or videoURL provided -> upload to S3 (if file), then post via graph-video endpoint
    if (uploadedVideo || videoURL) {
      let finalVideoUrl = videoURL;
      if (uploadedVideo) {
        finalVideoUrl = await uploadFileToS3Service(
          `facebook_uploads/${userId}`,
          uploadedVideo.buffer,
          uploadedVideo.mimetype || "video/mp4",
        );
        try {
          await UserModel.findByIdAndUpdate(userId, {
            $set: { "facebook.last_uploaded_video": finalVideoUrl },
          });
        } catch (dbErr) {
          console.warn("Failed to save video URL:", dbErr);
        }
      }

      const uploadUrl = `https://graph-video.facebook.com/v19.0/${id}/videos`;
      const resp = await axios.post(
        uploadUrl,
        {
          file_url: finalVideoUrl,
          title: message || "",
        },
        {
          headers: { Authorization: `Bearer ${pageAccessToken}` },
        },
      );
      return res.status(200).json({
        success: true,
        videoId: resp.data.id,
        message: "Video posted",
      });
    }

    return res.status(400).json({ error: "No valid content to post" });
  } catch (error: any) {
    console.error(
      "Universal Facebook post error:",
      error.response?.data || error.message,
    );
    return res
      .status(500)
      .json({ success: false, error: error.response?.data || error.message });
  }
};

export const getFacebookAllDetails = async (req: Request, res: Response) => {
  try {
    const { userId, pageId } = req.query as {
      userId?: string;
      pageId?: string;
    };
    if (!userId || !pageId) {
      return res
        .status(400)
        .json({ success: false, message: "userId and pageId are required" });
    }

    const { pageAccessToken, id: resolvedPageId } = await getPageTokenService(
      userId,
      pageId,
    );
    const pid = resolvedPageId || (pageId as string);

    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
    const until = new Date().toISOString().split("T")[0];

    const headers = { Authorization: `Bearer ${pageAccessToken}` };

    // Parallel fetches
    const [
      pageResp,
      postsResp,
      scheduledResp,
      insightsCountryResp,
      insightsGenderAgeResp,
      fanAddsResp,
    ] = await Promise.all([
      axios.get(
        `${FACEBOOK_GRAPH_URL}/${pid}?fields=id,name,about,fan_count,link,cover,category,location,username,picture{url}`,
        { headers },
      ),
      axios
        .get(
          `${FACEBOOK_GRAPH_URL}/${pid}/posts?limit=15&fields=id,created_time,message,permalink_url,type,comments.summary(true){id,message,created_time,from}`,
          { headers },
        )
        .catch(async () => {
          try {
            const minimal = await axios.get(
              `${FACEBOOK_GRAPH_URL}/${pid}/posts?limit=15&fields=id,created_time,message,permalink_url,type`,
              { headers },
            );
            return minimal;
          } catch (_) {
            return { data: { data: [] } } as any;
          }
        }),
      axios
        .get(
          `${FACEBOOK_GRAPH_URL}/${pid}/scheduled_posts?fields=id,message,scheduled_publish_time,permalink_url`,
          { headers },
        )
        .catch(() => ({ data: { data: [] } })),
      axios
        .get(
          `${FACEBOOK_GRAPH_URL}/${pid}/insights?metric=page_fans_country&period=lifetime`,
          { headers },
        )
        .catch(() => ({ data: { data: [] } })),
      axios
        .get(
          `${FACEBOOK_GRAPH_URL}/${pid}/insights?metric=page_fans_gender_age&period=lifetime`,
          { headers },
        )
        .catch(() => ({ data: { data: [] } })),
      axios
        .get(
          `${FACEBOOK_GRAPH_URL}/${pid}/insights?metric=page_fan_adds,page_fan_removes&since=${since}&until=${until}&period=day`,
          { headers },
        )
        .catch(() => ({ data: { data: [] } })),
    ]);

    // Demographics: Top locations (country)
    const countryInsight = (insightsCountryResp.data.data || []).find(
      (d: any) => d.name === "page_fans_country",
    );
    const countryMap = countryInsight?.values?.[0]?.value || {};
    const topLocations = Object.entries(countryMap)
      .map(([country, views]: any) => ({ country, views }))
      .sort((a: any, b: any) => Number(b.views) - Number(a.views))
      .slice(0, 5);

    // Demographics: Age/Gender
    const genderAgeInsight = (insightsGenderAgeResp.data.data || []).find(
      (d: any) => d.name === "page_fans_gender_age",
    );
    const gaMap = genderAgeInsight?.values?.[0]?.value || {};
    const ageRange = Object.entries(gaMap)
      .map(([k, v]: any) => ({ ageGroup: k.split(".")[1] || k, views: v }))
      .reduce((acc: any, cur: any) => {
        const found = acc.find((a: any) => a.ageGroup === cur.ageGroup);
        if (found) found.views += cur.views;
        else acc.push({ ...cur });
        return acc;
      }, [])
      .sort((a: any, b: any) => a.ageGroup.localeCompare(b.ageGroup));
    const gender = Object.entries(gaMap)
      .map(([k, v]: any) => ({ gender: k.split(".")[0] || k, views: v }))
      .reduce((acc: any, cur: any) => {
        const found = acc.find((g: any) => g.gender === cur.gender);
        if (found) found.views += cur.views;
        else acc.push({ ...cur });
        return acc;
      }, [])
      .sort((a: any, b: any) => a.gender.localeCompare(b.gender));

    // Growth trend
    const fanAdds =
      (fanAddsResp.data.data || []).find((d: any) => d.name === "page_fan_adds")
        ?.values || [];
    const growthTrend = fanAdds.map((r: any) => ({
      date: r.end_time?.split("T")[0] || "",
      views: r.value,
      subscribersGained: r.value,
    }));

    // Recent posts with simple classification
    const posts = postsResp.data.data || [];
    let photos = 0,
      videos = 0,
      links = 0,
      statuses = 0;
    const recentPosts = posts.map((p: any) => {
      const type = p.type || p.status_type;
      if (type === "photo") photos++;
      else if (type === "video") videos++;
      else if (type === "link") links++;
      else statuses++;
      return {
        id: p.id,
        message: p.message,
        created_time: p.created_time,
        permalink_url: p.permalink_url,
        full_picture: p.full_picture,
        type,
        shares: p.shares?.count || 0,
        commentsCount: p.comments?.summary?.total_count || 0,
      };
    });

    // Post activity
    const postActivity = {
      photos,
      videos,
      links,
      statuses,
      growthTrend,
    };

    // Recent comments pulled from recent posts
    const recentComments = (posts || []).flatMap((p: any) =>
      (p.comments?.data || []).map((c: any) => ({
        id: c.id,
        postId: p.id,
        text: c.message,
        author: c.from?.name,
        created_time: c.created_time,
      })),
    );

    // Post schedule
    const postSchedule = (scheduledResp.data.data || [])
      .map((sp: any) => ({
        id: sp.id,
        title: sp.message,
        scheduledAt: sp.scheduled_publish_time
          ? new Date(sp.scheduled_publish_time * 1000).toISOString()
          : undefined,
        permalink_url: sp.permalink_url,
        full_picture: sp.full_picture,
      }))
      .filter((s: any) => !!s.scheduledAt)
      .sort(
        (a: any, b: any) =>
          new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
      );

    const page = pageResp.data;
    const result = {
      page: {
        id: page.id,
        title: page.name,
        handle: page.username,
        description: page.about,
        link: page.link,
        picture: page.picture?.data?.url,
        fan_count: page.fan_count,
        cover: page.cover,
        category: page.category,
        location: page.location,
      },
      demographics: {
        topLocations,
        ageRange,
        gender,
      },
      postActivity,
      recentPosts,
      recentComments,
      postSchedule,
    };

    return res.status(200).json({ success: true, result });
  } catch (error: any) {
    console.error(
      "Error fetching Facebook all details:",
      error.response?.data || error.message,
    );
    return res.status(500).json({
      success: false,
      message: "Failed to fetch facebook details",
      error: error.response?.data || error.message,
    });
  }
};
