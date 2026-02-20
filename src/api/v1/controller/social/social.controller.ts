import { Request, Response } from "express";
import { fetchSocialMetrics } from "../../../../services/social/socialMetrics.service";
import { fetchAndStoreYoutubeData, getSnapshot as getYoutubeSnapshot } from "../../../../services/youtube/snapshot.service";
import { fetchAndStoreFacebookData, getSnapshot as getFacebookSnapshot } from "../../../../services/facebook/snapshot.service";
import { updateFbAllPostsEngagement } from "../../../../services/facebook/content.service";

export const getSocialMetrics = async (req: Request, res: Response) => {
  try {
    const userId =
      (req.query.user_id as string) || (req.query.userId as string);

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "user_id is required",
      });
    }

    const { items, errors } = await fetchSocialMetrics(userId);

    if (!items.length && errors?.length) {
      return res.status(502).json({
        success: false,
        message: "Failed to retrieve social metrics",
        errors,
      });
    }

    return res.status(200).json({
      success: true,
      result: {
        metrics: items,
        errors: errors || [],
      },
    });
  } catch (error: any) {
    console.error("Error fetching social metrics:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error?.message || String(error),
    });
  }
};

/**
 * Sync YouTube data for a user
 */
export const syncYoutube = async (req: Request, res: Response) => {
  try {
    const userId = (req.query.user_id as string) || (req.query.userId as string);

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "user_id is required",
      });
    }

    const data = await fetchAndStoreYoutubeData(userId);

    if (data) {
      console.log("YouTube data synchronized successfully", data);
    }

    return res.status(200).json({
      success: true,
      message: "YouTube data synchronized successfully",
      result: data,
    });
  } catch (error: any) {
    console.error("Error in syncYoutube controller:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error during YouTube sync",
    });
  }
};

/**
 * Sync Facebook data for a user
 */
export const syncFacebook = async (req: Request, res: Response) => {
  try {
    const userId = (req.query.user_id as string) || (req.query.userId as string);
    const pageId = (req.query.page_id as string) || (req.query.pageId as string);

    if (!userId || !pageId) {
      return res.status(400).json({
        success: false,
        message: "user_id and page_id are required",
      });
    }

    const data = await fetchAndStoreFacebookData(userId, pageId);

    // Also update engagement for all existing Facebook posts in our database
    try {
      await updateFbAllPostsEngagement(userId);
    } catch (engagementErr: any) {
      console.error("Error updating Facebook post engagement during sync:", engagementErr.message);
      // We don't fail the whole sync if only engagement update fails
    }

    if (data) {
      console.log("Facebook data synchronized successfully", data);
    }

    return res.status(200).json({
      success: true,
      message: "Facebook data synchronized successfully",
      result: data,
    });
  } catch (error: any) {
    console.error("Error in syncFacebook controller:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error during Facebook sync",
    });
  }
};

/**
 * Get YouTube dashboard data for a user
 */
export const getYoutubeDashboard = async (req: Request, res: Response) => {
  try {
    const userId = (req.query.user_id as string) || (req.query.userId as string);

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "user_id is required",
      });
    }

    const data = await getYoutubeSnapshot(userId);

    return res.status(200).json({
      success: true,
      result: data,
    });
  } catch (error: any) {
    console.error("Error in getYoutubeDashboard controller:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error during YouTube dashboard retrieval",
    });
  }
};

/**
 * Get Facebook dashboard data for a user
 */
export const getFacebookDashboard = async (req: Request, res: Response) => {
  try {
    const userId = (req.query.user_id as string) || (req.query.userId as string);

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "user_id is required",
      });
    }

    const data = await getFacebookSnapshot(userId);

    return res.status(200).json({
      success: true,
      result: data,
    });
  } catch (error: any) {
    console.error("Error in getFacebookDashboard controller:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error during Facebook dashboard retrieval",
    });
  }
};
