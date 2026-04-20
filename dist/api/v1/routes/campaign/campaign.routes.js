"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const campaign_controller_1 = require("../../controller/campaign/campaign.controller");
const userAuth_1 = require("../../middlewares/auth/userAuth");
const campaignRouter = express_1.default.Router();
campaignRouter.use(userAuth_1.userAuth);
campaignRouter.post("/create", campaign_controller_1.createCampaign);
campaignRouter.get("/", campaign_controller_1.getCampaigns);
campaignRouter.patch("/:campaignId/status", campaign_controller_1.updateCampaignStatus);
campaignRouter.delete("/:campaignId", campaign_controller_1.deleteCampaign);
exports.default = campaignRouter;
