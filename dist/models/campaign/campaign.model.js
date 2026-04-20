"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const campaign_schema_1 = require("./campaign.schema");
const CampaignModel = (0, mongoose_1.model)("campaigns", campaign_schema_1.campaignSchema);
exports.default = CampaignModel;
