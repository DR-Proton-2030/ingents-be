import { Request, Response } from "express";
import axios from "axios";
import {
  resolveScheduledPublishTime,
  validateScheduledPublishTime,
} from "../../../../services/facebook/facebook.service";
import { uploadFileToS3Service } from "../../../../services/uploadFile/uploadFile";
import {
  createInstagramMedia,
  getInstagramAuthURL,
  getInstagramLongLivedToken,
  getInstagramMediaStatus,
  getInstagramProfile,
  getInstagramUser,
  publishInstagramMedia,
} from "../../../../services/instagram/instagram.service";
import UserModel from "../../../../models/users/users.model";
import PostedContentModel from "../../../../models/postedContent/postedContent.model";

export const instagramLogin = (req: Request, res: Response) => {
  const { user_id } = req.query;
  console.log("user_id", user_id);
  if (!user_id) return res.status(400).json({ error: "Client ID is required" });
  const authUrl = getInstagramAuthURL(user_id as string);
  res.redirect(authUrl);
};

export const instagramAuthCallback = async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query;

    console.log("Instagram code and stste : ", code, state);
    if (!code) return res.status(400).json({ error: "No code provided" });

    // Exchange code for access token & user data
    const { tokens } = await getInstagramUser(code as string);

    console.log("====>state : ", state);
    const userId = state ? atob(state as string) : null;

    if (userId) {
      try {
        const profile = await getInstagramProfile(tokens.access_token);
        await UserModel.findByIdAndUpdate(userId, {
          $set: {
            "instagram.project_id": profile.id,
            "instagram.name":  profile.username,
            "instagram.access_token": tokens.access_token,
          },
        });
      } catch (profileError) {
        console.error("Failed to store Instagram profile details:", profileError);
      }
    }

    // Redirect to frontend with token & pages as query params
    res.redirect(
      `${process.env.FRONTEND_URL}/dashboard/social-media?platform=instagram&token=${tokens.access_token}&user_id=${userId}`
    );
  } catch (error) {
    console.error("OAuth authentication failed:", error);
    res.status(500).json({ error: "OAuth authentication failed" });
  }
};

export const fetchInstagramProfileController = async (
  req: Request,
  res: Response
) => {
  try {
    const { access_token, userId } = req.query;

    if (!access_token || typeof access_token !== "string") {
      return res.status(400).json({ error: "Access token is required" });
    }

    if (!userId) {
      return res.status(400).json({ error: "Missing userId in query" });
    }

    const longTokenResponse = await getInstagramLongLivedToken(access_token);
    console.log(longTokenResponse);
    const longLivedToken = longTokenResponse.access_token;

    const [savedUser, profile] = await Promise.all([
      UserModel.findByIdAndUpdate(
        userId,
        { $set: { "instagram.access_token": longLivedToken } },
        { new: true }
      ),
      getInstagramProfile(longLivedToken),
    ]);
    console.log(savedUser);
    res.status(200).json({
      success: true,
      // user: savedUser,
      result: profile,
    });
  } catch (error: any) {
    console.error("Failed to get Instagram profile:", error.message);
    res.status(500).json({ error: "Failed to fetch Instagram profile" });
  }
};

export const publishInstagramPost = async (req: Request, res: Response) => {
  try {
    const { access_token, igUserId, image_url, caption, userId } = req.body;

    if (!access_token || !igUserId || !image_url) {
      return res
        .status(400)
        .json({ error: "access_token, igUserId and image_url are required" });
    }

    const container = await createInstagramMedia({
      accessToken: access_token,
      igUserId,
      imageUrl: image_url,
      caption,
    });

    // Wait for media to be ready
    let status = "IN_PROGRESS";
    let attempts = 0;
    while (status !== "FINISHED" && attempts < 30) {
      if (attempts > 0) await new Promise((res) => setTimeout(res, 5000));
      const statusData = await getInstagramMediaStatus({
        accessToken: access_token,
        containerId: container.id,
      });
      status = statusData.status_code;
      if (status === "ERROR") throw new Error("Media processing failed");
      attempts++;
    }

    const published = await publishInstagramMedia({
      accessToken: access_token,
      igUserId,
      containerId: container.id,
    });

    // Save to history
    if (userId) {
      await PostedContentModel.create({
        user_id: userId,
        platform: "instagram",
        content: caption || "",
        media_urls: [image_url],
        media_type: "image",
        posted_at: new Date(),
        platform_post_id: published.id,
        is_scheduled: false,
        status: "published",
      });
    }

    res.status(200).json({
      success: true,
      message: "Instagram post published successfully....",
      containerId: container.id,
      postId: published.id,
    });
  } catch (error: any) {
    console.error("Failed to publish Instagram post:", error.message);
    res.status(500).json({
      error: "Failed to publish Instagram post",
    });
  }
};

// Universal Instagram post: image or video
export const postInstagramUniversal = async (req: Request, res: Response) => {
  try {
    const { userId, message, imageUrl, videoURL } = req.body;
    const uploadedImage = (req as any).files?.image?.[0];
    const uploadedVideo = (req as any).files?.video?.[0];

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const user = await UserModel.findById(userId).exec();
    if (!user || !user.instagram?.access_token || !user.instagram?.project_id) {
      return res.status(400).json({ error: "Instagram account not connected or missing credentials" });
    }

    const igAccessToken = user.instagram.access_token;
    const igUserId = user.instagram.project_id;

    if (!uploadedImage && !imageUrl && !uploadedVideo && !videoURL) {
      return res.status(400).json({ error: "An image or video is required for Instagram" });
    }

    let finalMediaUrl = "";
    let mediaType: "IMAGE" | "VIDEO" = "IMAGE";

    if (uploadedImage || imageUrl) {
      mediaType = "IMAGE";
      finalMediaUrl = imageUrl || "";
      if (uploadedImage) {
        finalMediaUrl = (await uploadFileToS3Service(
          `instagram_uploads/${userId}`,
          uploadedImage.buffer,
          uploadedImage.mimetype || "image/jpeg"
        )) || "";
      }
    } else if (uploadedVideo || videoURL) {
      mediaType = "VIDEO";
      finalMediaUrl = videoURL || "";
      if (uploadedVideo) {
        finalMediaUrl = (await uploadFileToS3Service(
          `instagram_uploads/${userId}`,
          uploadedVideo.buffer,
          uploadedVideo.mimetype || "video/mp4"
        )) || "";
      }
    }

    // Create media container
    const container = await createInstagramMedia({
      accessToken: igAccessToken,
      igUserId,
      imageUrl: mediaType === "IMAGE" ? finalMediaUrl : undefined,
      videoUrl: mediaType === "VIDEO" ? finalMediaUrl : undefined,
      caption: message,
      mediaType,
    });

    // Wait for media to be ready (especially for videos)
    let status = "IN_PROGRESS";
    let attempts = 0;
    while (status !== "FINISHED" && attempts < 40) {
      if (attempts > 0) await new Promise((res) => setTimeout(res, 5000));
      const statusData = await getInstagramMediaStatus({
        accessToken: igAccessToken,
        containerId: container.id,
      });
      status = statusData.status_code;
      if (status === "ERROR") throw new Error("Media processing failed");
      if (status === "FINISHED") break;
      attempts++;
    }

    const published = await publishInstagramMedia({
      accessToken: igAccessToken,
      igUserId,
      containerId: container.id,
    });

    // Save to history
    await PostedContentModel.create({
      user_id: userId,
      platform: "instagram",
      content: message || "",
      media_urls: [finalMediaUrl],
      media_type: mediaType.toLowerCase(),
      posted_at: new Date(),
      platform_post_id: published.id,
      is_scheduled: false,
      status: "published",
    });

    return res.status(200).json({
      success: true,
      postId: published.id,
      message: `${mediaType === "IMAGE" ? "Image" : "Video"} posted`,
    });
  } catch (error: any) {
    console.error("Universal Instagram post error:", error.response?.data || error.message);
    return res.status(500).json({ success: false, error: error.response?.data || error.message });
  }
};

// Disconnect Instagram Account
export const disconnectInstagram = async (req: Request, res: Response) => {
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

    const tokenToRevoke = user.instagram?.access_token;

    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      {
        $set: {
          "instagram.project_id": null,
          "instagram.name": null,
          "instagram.access_token": null,
        },
      },
      { new: true },
    ).exec();

    if (tokenToRevoke) {
      try {
        // Revoke app permissions for the user
        // Using graph.instagram.com as tokens are now native to this endpoint
        await axios.delete(`https://graph.instagram.com/v18.0/me/permissions`, {
          headers: { Authorization: `Bearer ${tokenToRevoke}` },
        });
      } catch (revokeErr: any) {
        console.warn(
          "Failed to revoke Instagram token:",
          revokeErr?.response?.data || revokeErr?.message || revokeErr,
        );
      }
    }

    return res.status(200).json({
      success: true,
      message: "Instagram disconnected successfully",
      user: updatedUser,
    });
  } catch (error: any) {
    console.error("Error disconnecting Instagram:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to disconnect Instagram",
      error: error.message,
    });
  }
};
