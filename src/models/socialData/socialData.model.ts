import { model, Schema } from "mongoose";
import socialDataSchema from "./socialData.schema";
import { ISocialData } from "../../types/interface/socialData.interface";
import { youtubeMetricsSchema } from "./youtube/youtubeData.schema";
import { facebookMetricsSchema } from "./facebook/facebookData.schema";
import { instagramMetricsSchema } from "./instagram/instagramData.schema";

const SocialDataModel = model<ISocialData>("social_data", socialDataSchema);

// --- Apply Discriminators to "use" the platform-specific schemas ---

// YouTube strict schema
SocialDataModel.discriminator(
  "youtube",
  new Schema({ data: youtubeMetricsSchema }, { _id: false })
);

// Facebook strict schema
SocialDataModel.discriminator(
  "facebook",
  new Schema({ data: facebookMetricsSchema }, { _id: false })
);

// Instagram strict schema
// SocialDataModel.discriminator(
//   "instagram",
//   new Schema({ data: instagramMetricsSchema }, { _id: false })
// );

// Instagram Business strict schema
SocialDataModel.discriminator(
  "instagram_business",
  new Schema({ data: instagramMetricsSchema }, { _id: false })
);

export default SocialDataModel;
