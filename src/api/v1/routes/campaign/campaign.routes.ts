import express from "express";
import {
  createCampaign,
  deleteCampaign,
  getCampaigns,
  updateCampaignStatus,
} from "../../controller/campaign/campaign.controller";
import { userAuth } from "../../middlewares/auth/userAuth";

const campaignRouter = express.Router();

campaignRouter.use(userAuth);

campaignRouter.post("/create", createCampaign);
campaignRouter.get("/", getCampaigns);
campaignRouter.patch("/:campaignId/status", updateCampaignStatus);
campaignRouter.delete("/:campaignId", deleteCampaign);

export default campaignRouter;
