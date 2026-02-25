"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const socialData_schema_1 = __importDefault(require("./socialData.schema"));
const youtubeData_schema_1 = require("./youtube/youtubeData.schema");
const facebookData_schema_1 = require("./facebook/facebookData.schema");
const instagramData_schema_1 = require("./instagram/instagramData.schema");
const SocialDataModel = (0, mongoose_1.model)("social_data", socialData_schema_1.default);
// --- Apply Discriminators to "use" the platform-specific schemas ---
// YouTube strict schema
SocialDataModel.discriminator("youtube", new mongoose_1.Schema({ data: youtubeData_schema_1.youtubeMetricsSchema }, { _id: false }));
// Facebook strict schema
SocialDataModel.discriminator("facebook", new mongoose_1.Schema({ data: facebookData_schema_1.facebookMetricsSchema }, { _id: false }));
// Instagram strict schema
SocialDataModel.discriminator("instagram", new mongoose_1.Schema({ data: instagramData_schema_1.instagramMetricsSchema }, { _id: false }));
exports.default = SocialDataModel;
