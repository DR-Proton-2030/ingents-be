import { Request, Response } from "express";
import { Types } from "mongoose";
import CampaignModel from "../../../../models/campaign/campaign.model";
import { ICampaign } from "../../../../types/interface/campaign.interface";
import { logActivity } from "../../../../services/activityLog/activityLog.service";
import UserModel from "../../../../models/users/users.model";
import { schedulePost } from "../../../../services/scheduler/scheduler.service";

export const createCampaign = async (req: Request, res: Response) => {
  try {
    const { name, type, message_content, frequency, recurring_days } = req.body;
    const { _id: user_object_id, company_object_id } = req.user;

    if (!name || !type || !message_content || !frequency) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const newCampaignPayload: ICampaign = {
      name,
      type,
      message_content,
      frequency,
      recurring_days: frequency === "recurring" ? recurring_days || [] : [],
      status: "active",
      created_by_user_object_id: user_object_id,
      company_object_id: company_object_id!,
    };

    const newCampaign = await new CampaignModel(newCampaignPayload).save();

    // Trigger Social Posts immediately if it's a social broadcast one-time for now to mock the actual recurring engine
    if (type === "social_broadcaster") {
      const user = await UserModel.findById(user_object_id);
      if (user) {
        const platforms: ("facebook" | "instagram" | "youtube" | "x")[] = [];
        if (user.facebook?.access_token && user.facebook?.project_id) platforms.push("facebook");
        if (user.instagram?.access_token) platforms.push("instagram");
        if (user.x?.access_token) platforms.push("x");
        
        for (const platform of platforms) {
          try {
            await schedulePost({
              user_id: new Types.ObjectId(user_object_id as string),
              platform,
              content: message_content,
              media_urls: [], 
              media_type: "text",
              hashtags: ["#campaign", "#ingents"],
              scheduled_at: new Date(Date.now() + 10000), // Schedule 10s from now
              page_id: platform === "facebook" ? user.facebook?.project_id : undefined,
            });
          } catch (e) {
            console.error(`Failed to schedule campaign post for ${platform}`, e);
          }
        }
      }
    }

    logActivity({
      company_object_id: company_object_id?.toString(),
      actor_object_id: user_object_id?.toString(),
      actor_name: req.user?.full_name || "Unknown",
      activity_type: "CAMPAIGN_CREATED",
      message: `created a new campaign "${name}"`,
      metadata: { campaign_id: newCampaign?._id },
    });

    res.status(201).json({
      message: "Campaign created successfully",
      data: newCampaign,
    });
  } catch (error) {
    console.error("❌ Create Campaign Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getCampaigns = async (req: Request, res: Response) => {
  try {
    const { company_object_id } = req.user;
    const { page, limit } = req.query;

    const currentPage = Number(page) || 1;
    const pageLimit = Number(limit) || 30;
    const startIndex = (currentPage - 1) * pageLimit;

    const filter = { company_object_id: company_object_id! };

    const totalCampaigns = await CampaignModel.countDocuments(filter);
    const campaigns = await CampaignModel.find(filter)
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(pageLimit)
      .lean();

    res.status(200).json({
      message: "Campaigns fetched successfully",
      data: campaigns,
      pagination: {
        currentPage,
        totalCount: totalCampaigns,
        totalPages: Math.ceil(totalCampaigns / pageLimit),
      },
    });
  } catch (error) {
    console.error("❌ Get Campaigns Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateCampaignStatus = async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;
    const { status } = req.body;
    const { company_object_id } = req.user;

    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }

    const validStatuses = ["active", "draft", "paused", "completed"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const campaign = await CampaignModel.findOneAndUpdate(
      { _id: campaignId, company_object_id },
      { status },
      { new: true }
    );

    if (!campaign) {
      return res.status(404).json({ message: "Campaign not found" });
    }

    logActivity({
      company_object_id: company_object_id?.toString(),
      actor_object_id: req.user?._id?.toString(),
      actor_name: req.user?.full_name || "Unknown",
      activity_type: "CAMPAIGN_UPDATED",
      message: `updated campaign status to "${status}"`,
      metadata: { campaign_id: campaignId },
    });

    res.status(200).json({
      message: "Campaign status updated successfully",
      data: campaign,
    });
  } catch (error) {
    console.error("❌ Update Campaign Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteCampaign = async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;
    const { company_object_id } = req.user;

    const campaign = await CampaignModel.findOneAndDelete({
      _id: campaignId,
      company_object_id,
    });

    if (!campaign) {
      return res.status(404).json({ message: "Campaign not found" });
    }

    logActivity({
      company_object_id: company_object_id?.toString(),
      actor_object_id: req.user?._id?.toString(),
      actor_name: req.user?.full_name || "Unknown",
      activity_type: "CAMPAIGN_DELETED",
      message: `deleted a campaign`,
      metadata: { campaign_id: campaignId },
    });

    res.status(200).json({ message: "Campaign deleted successfully" });
  } catch (error) {
    console.error("❌ Delete Campaign Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
