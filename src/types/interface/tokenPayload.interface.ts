import { ObjectId, Schema, SchemaDefinitionProperty, Types } from "mongoose";

export interface ItokenPayload {
  _id: string;
  role?: string;
  company_object_id: string;
}
