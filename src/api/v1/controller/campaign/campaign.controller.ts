import { Request, Response } from "express";
import { Types } from "mongoose";
import CampaignModel from "../../../../models/campaign/campaign.model";
import { ICampaign } from "../../../../types/interface/campaign.interface";
import { logActivity } from "../../../../services/activityLog/activityLog.service";
import UserModel from "../../../../models/users/users.model";
import { schedulePost, scheduleRecurringCampaign, cancelRecurringCampaign } from "../../../../services/scheduler/scheduler.service";

export const createCampaign = async (req: Request, res: Response) => {
  try {
    const { name, type, message_content, frequency, recurring_days, scheduled_time } = req.body;
    const { _id: user_object_id, company_object_id } = req.user;

    if (!name || !type || !message_content || !frequency) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    
    if (frequency === "recurring" && (!scheduled_time || !recurring_days || recurring_days.length === 0)) {
       return res.status(400).json({ message: "Missing schedule details for recurring campaign" });
    }

    const newCampaignPayload: ICampaign = {
      name,
      type,
      message_content,
      frequency,
      recurring_days: frequency === "recurring" ? recurring_days || [] : [],
      scheduled_time: frequency === "recurring" ? scheduled_time : undefined,
      status: "active",
      created_by_user_object_id: user_object_id,
      company_object_id: company_object_id!,
    };

    const newCampaign = await new CampaignModel(newCampaignPayload).save();

    // Dispatch to BullMQ based on Frequency
    if (type === "social_broadcaster") {
       if (frequency === "once") {
          // Fire One-time immediately
          const user = await UserModel.findById(user_object_id);
          if (user) {
            const platforms: ("facebook" | "instagram" | "youtube" | "x")[] = [];
            if (user.facebook?.access_token && user.facebook?.project_id) platforms.push("facebook");
            if (user.instagram?.access_token) platforms.push("instagram");
            if (user.youtube?.access_token) platforms.push("youtube");
            if (user.x?.access_token) platforms.push("x");
            
            for (const platform of platforms) {
              try {
                await schedulePost({
                  user_id: new Types.ObjectId(user_object_id as string),
                  platform,
                  content: message_content,
                  media_urls: [], 
                  media_type: "text",
                  hashtags: ["#campaign"],
                  scheduled_at: new Date(Date.now() + 10000), // Schedule 10s from now
                  page_id: platform === "facebook" ? user.facebook?.project_id : undefined,
                });
              } catch (e) {
                console.error(`Failed to schedule campaign post for ${platform}`, e);
              }
            }
          }
       } else if (frequency === "recurring") {
          // Register daily cron in BullMQ
          try {
             await scheduleRecurringCampaign(newCampaign._id.toString(), scheduled_time, recurring_days);
          } catch(e) {
             console.error("Failed to register repeating campaign job", e);
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

    // Toggle repeatable job based on new status
    if (campaign.frequency === "recurring") {
       if (status === "active") {
          await scheduleRecurringCampaign(campaign._id.toString(), campaign.scheduled_time || "09:00", campaign.recurring_days || []);
       } else {
          await cancelRecurringCampaign(campaign._id.toString());
       }
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

    if (campaign.frequency === "recurring") {
       await cancelRecurringCampaign(campaignId);
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
