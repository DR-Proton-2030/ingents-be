import { SchemaDefinitionProperty, Types } from "mongoose";

export type CampaignType = "social_broadcaster" | "whatsapp_messenger";
export type CampaignFrequency = "once" | "recurring";

export interface ICampaign {
  name: string;
  type: CampaignType;
  message_content: string;
  frequency: CampaignFrequency;
  recurring_days?: string[];
  status: "active" | "draft" | "paused" | "completed";
  created_by_user_object_id: SchemaDefinitionProperty<Types.ObjectId>;
  company_object_id: SchemaDefinitionProperty<Types.ObjectId>;
  created_at?: Date;
  updated_at?: Date;
}
