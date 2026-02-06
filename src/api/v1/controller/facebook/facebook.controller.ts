import { Request, Response } from "express";
import {
  getFacebookAuthURL,
  getFacebookUser,
  getLongLivedToken,
  getPageTokenService,
  resolveScheduledPublishTime,
  validateScheduledPublishTime,
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
    const scheduledPublishTime = resolveScheduledPublishTime(req.body);

    // Validate scheduled publish time early to avoid Graph API errors
    const scheduleValidationError =
      validateScheduledPublishTime(scheduledPublishTime);
    if (scheduleValidationError) {
      return res.status(400).json({
        success: false,
        message: scheduleValidationError,
      });
    }

    if (!userId || !pageId) {
      return res.status(400).json({ error: "userId and pageId are required" });
    }

    // Get page access token
    const { pageAccessToken, id } = await getPageTokenService(userId, pageId);

    // Priority: if message only, post text; if image present (file or url), post image; if video present, post video
    if (message && !uploadedImage && !uploadedVideo && !imageUrl && !videoURL) {
      // Text only (immediate or scheduled)
      const payload: any = {
        message,
        access_token: pageAccessToken,
      };
      if (scheduledPublishTime) {
        // Facebook scheduled post requires published=false
        payload.published = false;
        payload.scheduled_publish_time = scheduledPublishTime;
      }
      const postRes = await axios.post(
        `${FACEBOOK_GRAPH_URL}/${id}/feed`,
        payload,
      );
      if (scheduledPublishTime) {
        // Fetch more details for the scheduled post
        const detailsRes = await axios.get(
          `${FACEBOOK_GRAPH_URL}/${postRes.data.id}?fields=id,message,scheduled_publish_time,permalink_url,created_time,is_published`,
          { headers: { Authorization: `Bearer ${pageAccessToken}` } },
        );
        const sp = detailsRes.data || {};
        const scheduledDetails = {
          id: sp.id || postRes.data.id,
          title: sp.message || message || "",
          scheduledAt: sp.scheduled_publish_time
            ? new Date(sp.scheduled_publish_time * 1000).toISOString()
            : new Date(scheduledPublishTime * 1000).toISOString(),
          permalink_url: sp.permalink_url,
          created_time: sp.created_time,
          is_published: Boolean(sp.is_published),
        };
        return res.status(200).json({
          success: true,
          scheduled: true,
          scheduled_publish_time: scheduledPublishTime,
          details: scheduledDetails,
          message: "Text scheduled",
        });
      }
      return res.status(200).json({
        success: true,
        postId: postRes.data.id,
        scheduled: Boolean(scheduledPublishTime),
        scheduled_publish_time: scheduledPublishTime || undefined,
        message: scheduledPublishTime ? "Text scheduled" : "Text posted",
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

      const imgPayload: any = {
        url: finalImageUrl,
        // 'caption' is not a valid field on Photo; use 'message' for the photo's caption
        message: message || "",
        access_token: pageAccessToken,
      };
      if (scheduledPublishTime) {
        imgPayload.published = false;
        imgPayload.scheduled_publish_time = scheduledPublishTime;
      }

      const imgRes = await axios.post(
        `${FACEBOOK_GRAPH_URL}/${id}/photos`,
        imgPayload,
      );
      if (scheduledPublishTime) {
        try {
          // Do not request 'scheduled_publish_time' on Photo node to avoid errors
          const detailsRes = await axios.get(
            `${FACEBOOK_GRAPH_URL}/${imgRes.data.id}?fields=id,name,permalink_url,full_picture,created_time,is_published`,
            { headers: { Authorization: `Bearer ${pageAccessToken}` } },
          );
          const sp = detailsRes.data || {};
          const scheduledDetails = {
            id: sp.id || imgRes.data.id,
            title: sp.name || message || "",
            scheduledAt: new Date(scheduledPublishTime * 1000).toISOString(),
            permalink_url: sp.permalink_url,
            full_picture: sp.full_picture,
            created_time: sp.created_time,
            is_published: Boolean(sp.is_published),
          };
          return res.status(200).json({
            success: true,
            scheduled: true,
            scheduled_publish_time: scheduledPublishTime,
            details: scheduledDetails,
            message: "Image scheduled",
          });
        } catch (_) {
          // Fallback if details fetch fails
          return res.status(200).json({
            success: true,
            scheduled: true,
            scheduled_publish_time: scheduledPublishTime,
            details: {
              id: imgRes.data.id,
              title: message || "",
              scheduledAt: new Date(scheduledPublishTime * 1000).toISOString(),
            },
            message: "Image scheduled",
          });
        }
      }
      return res.status(200).json({
        success: true,
        postId: imgRes.data.id,
        scheduled: Boolean(scheduledPublishTime),
        scheduled_publish_time: scheduledPublishTime || undefined,
        message: scheduledPublishTime ? "Image scheduled" : "Image posted",
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
      const vidPayload: any = {
        file_url: finalVideoUrl,
        title: message || "",
      };
      if (scheduledPublishTime) {
        vidPayload.published = false;
        vidPayload.scheduled_publish_time = scheduledPublishTime;
      }
      const resp = await axios.post(uploadUrl, vidPayload, {
        headers: { Authorization: `Bearer ${pageAccessToken}` },
      });
      if (scheduledPublishTime) {
        const detailsUrl = `https://graph-video.facebook.com/v19.0/${resp.data.id}?fields=id,permalink_url,scheduled_publish_time,title,description,created_time,thumbnails{uri},is_published`;
        const detailsRes = await axios.get(detailsUrl, {
          headers: { Authorization: `Bearer ${pageAccessToken}` },
        });
        const sp = detailsRes.data || {};
        const thumb = sp.thumbnails?.data?.[0]?.uri;
        const scheduledDetails = {
          id: sp.id || resp.data.id,
          title: sp.title || message || "",
          scheduledAt: sp.scheduled_publish_time
            ? new Date(sp.scheduled_publish_time * 1000).toISOString()
            : new Date(scheduledPublishTime * 1000).toISOString(),
          permalink_url: sp.permalink_url,
          thumbnail: thumb,
          created_time: sp.created_time,
          is_published: Boolean(sp.is_published),
        };
        return res.status(200).json({
          success: true,
          scheduled: true,
          scheduled_publish_time: scheduledPublishTime,
          details: scheduledDetails,
          message: "Video scheduled",
        });
      }
      return res.status(200).json({
        success: true,
        videoId: resp.data.id,
        scheduled: Boolean(scheduledPublishTime),
        scheduled_publish_time: scheduledPublishTime || undefined,
        message: scheduledPublishTime ? "Video scheduled" : "Video posted",
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
          `${FACEBOOK_GRAPH_URL}/${pid}/scheduled_posts?fields=id,message,scheduled_publish_time,permalink_url,full_picture,status_type,created_time,is_published`,
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
        status_type: sp.status_type,
        created_time: sp.created_time,
        is_published: Boolean(sp.is_published),
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

export const disconnectFacebook = async (req: Request, res: Response) => {
  try {
    const userId =
      (req.body?.userId as string) ||
      (req.body?.user_id as string) ||
      (req.query?.userId as string) ||
      (req.query?.user_id as string);

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId is required",
      });
    }

    const user = await UserModel.findById(userId).exec();
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const tokenToRevoke = user.facebook?.access_token;

    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      {
        $set: {
          "facebook.project_id": null,
          "facebook.name": null,
          "facebook.access_token": null,
        },
      },
      { new: true },
    ).exec();

    if (tokenToRevoke) {
      try {
        // Revoke app permissions for the user
        await axios.delete(`${FACEBOOK_GRAPH_URL}/me/permissions`, {
          headers: { Authorization: `Bearer ${tokenToRevoke}` },
        });
      } catch (revokeErr: any) {
        console.warn(
          "Failed to revoke Facebook token:",
          revokeErr?.response?.data || revokeErr?.message || revokeErr,
        );
      }
    }

    return res.status(200).json({
      success: true,
      message: "Facebook disconnected successfully",
      user: updatedUser,
    });
  } catch (error: any) {
    console.error("Error disconnecting Facebook:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to disconnect Facebook",
      error: error.message,
    });
  }
};
