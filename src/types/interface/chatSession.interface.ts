import { SchemaDefinitionProperty, Types } from "mongoose";

export interface IChatSession{
  userId: SchemaDefinitionProperty<Types.ObjectId>;
  title?: string;
}