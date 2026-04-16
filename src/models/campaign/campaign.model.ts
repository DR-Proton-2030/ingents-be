import { model } from "mongoose";
import { ICampaign } from "../../types/interface/campaign.interface";
import { campaignSchema } from "./campaign.schema";

const CampaignModel = model<ICampaign>("campaigns", campaignSchema);

export default CampaignModel;
