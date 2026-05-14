"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCampaign = exports.updateCampaignStatus = exports.getCampaigns = exports.createCampaign = void 0;
const mongoose_1 = require("mongoose");
const campaign_model_1 = __importDefault(require("../../../../models/campaign/campaign.model"));
const activityLog_service_1 = require("../../../../services/activityLog/activityLog.service");
const scheduler_service_1 = require("../../../../services/scheduler/scheduler.service");
const createCampaign = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { name, type, message_content, frequency, recurring_days, scheduled_time, target_numbers, ai_context, use_ai_generation } = req.body;
        const { _id: user_object_id, company_object_id } = req.user;
        const isAiEnabled = use_ai_generation === true;
        if (!name || !type || (!isAiEnabled && !message_content) || !frequency) {
            return res.status(400).json({ message: "Missing required fields" });
        }
        if (frequency === "recurring" && (!scheduled_time || !recurring_days || recurring_days.length === 0)) {
            return res.status(400).json({ message: "Missing schedule details for recurring campaign" });
        }
        const newCampaignPayload = {
            name,
            type,
            message_content: message_content || "",
            frequency,
            recurring_days: frequency === "recurring" ? recurring_days || [] : [],
            scheduled_time: frequency === "recurring" ? scheduled_time : undefined,
            target_numbers: target_numbers || [],
            ai_context,
            use_ai_generation: isAiEnabled,
            status: "active",
            created_by_user_object_id: new mongoose_1.Types.ObjectId(user_object_id),
            company_object_id: new mongoose_1.Types.ObjectId(company_object_id),
        };
        const newCampaign = yield new campaign_model_1.default(newCampaignPayload).save();
        // Dispatch to BullMQ based on Frequency
        if (frequency === "once") {
            // Fire One-time trigger (handles logic for both WhatsApp and Social + AI dynamic generation)
            try {
                yield (0, scheduler_service_1.triggerCampaignNow)(newCampaign._id.toString());
            }
            catch (e) {
                console.error("Failed to trigger one-time campaign", e);
            }
        }
        else if (frequency === "recurring") {
            // Register daily cron in BullMQ
            try {
                yield (0, scheduler_service_1.scheduleRecurringCampaign)(newCampaign._id.toString(), scheduled_time, recurring_days);
            }
            catch (e) {
                console.error("Failed to register repeating campaign job", e);
            }
        }
        (0, activityLog_service_1.logActivity)({
            company_object_id: company_object_id === null || company_object_id === void 0 ? void 0 : company_object_id.toString(),
            actor_object_id: user_object_id === null || user_object_id === void 0 ? void 0 : user_object_id.toString(),
            actor_name: ((_a = req.user) === null || _a === void 0 ? void 0 : _a.full_name) || "Unknown",
            activity_type: "CAMPAIGN_CREATED",
            message: `created a new campaign "${name}"`,
            metadata: { campaign_id: newCampaign === null || newCampaign === void 0 ? void 0 : newCampaign._id },
        });
        res.status(201).json({
            message: "Campaign created successfully",
            data: newCampaign,
        });
    }
    catch (error) {
        console.error("❌ Create Campaign Error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});
exports.createCampaign = createCampaign;
const getCampaigns = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { company_object_id } = req.user;
        const { page, limit } = req.query;
        const currentPage = Number(page) || 1;
        const pageLimit = Number(limit) || 30;
        const startIndex = (currentPage - 1) * pageLimit;
        const filter = { company_object_id: company_object_id };
        const totalCampaigns = yield campaign_model_1.default.countDocuments(filter);
        const campaigns = yield campaign_model_1.default.find(filter)
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
    }
    catch (error) {
        console.error("❌ Get Campaigns Error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});
exports.getCampaigns = getCampaigns;
const updateCampaignStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _b, _c, _d;
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
        const campaign = yield campaign_model_1.default.findOneAndUpdate({ _id: campaignId, company_object_id }, { status }, { new: true });
        if (!campaign) {
            return res.status(404).json({ message: "Campaign not found" });
        }
        // Toggle repeatable job based on new status
        if (campaign.frequency === "recurring") {
            if (status === "active") {
                yield (0, scheduler_service_1.scheduleRecurringCampaign)(campaign._id.toString(), campaign.scheduled_time || "09:00", campaign.recurring_days || []);
            }
            else {
                yield (0, scheduler_service_1.cancelRecurringCampaign)(campaign._id.toString());
            }
        }
        (0, activityLog_service_1.logActivity)({
            company_object_id: company_object_id === null || company_object_id === void 0 ? void 0 : company_object_id.toString(),
            actor_object_id: (_c = (_b = req.user) === null || _b === void 0 ? void 0 : _b._id) === null || _c === void 0 ? void 0 : _c.toString(),
            actor_name: ((_d = req.user) === null || _d === void 0 ? void 0 : _d.full_name) || "Unknown",
            activity_type: "CAMPAIGN_UPDATED",
            message: `updated campaign status to "${status}"`,
            metadata: { campaign_id: campaignId },
        });
        res.status(200).json({
            message: "Campaign status updated successfully",
            data: campaign,
        });
    }
    catch (error) {
        console.error("❌ Update Campaign Error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});
exports.updateCampaignStatus = updateCampaignStatus;
const deleteCampaign = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _e, _f, _g;
    try {
        const { campaignId } = req.params;
        const { company_object_id } = req.user;
        const campaign = yield campaign_model_1.default.findOneAndDelete({
            _id: campaignId,
            company_object_id,
        });
        if (!campaign) {
            return res.status(404).json({ message: "Campaign not found" });
        }
        if (campaign.frequency === "recurring") {
            yield (0, scheduler_service_1.cancelRecurringCampaign)(campaignId);
        }
        (0, activityLog_service_1.logActivity)({
            company_object_id: company_object_id === null || company_object_id === void 0 ? void 0 : company_object_id.toString(),
            actor_object_id: (_f = (_e = req.user) === null || _e === void 0 ? void 0 : _e._id) === null || _f === void 0 ? void 0 : _f.toString(),
            actor_name: ((_g = req.user) === null || _g === void 0 ? void 0 : _g.full_name) || "Unknown",
            activity_type: "CAMPAIGN_DELETED",
            message: `deleted a campaign`,
            metadata: { campaign_id: campaignId },
        });
        res.status(200).json({ message: "Campaign deleted successfully" });
    }
    catch (error) {
        console.error("❌ Delete Campaign Error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});
exports.deleteCampaign = deleteCampaign;
