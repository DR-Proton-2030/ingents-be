import { Document, Types } from "mongoose";

export interface IAITokenUsage extends Document {
  company_object_id: Types.ObjectId;
  user_object_id: Types.ObjectId;
  feature: string;
  tokens_used: number;
  prompt_tokens: number;
  completion_tokens: number;
  createdAt: Date;
  updatedAt: Date;
}
