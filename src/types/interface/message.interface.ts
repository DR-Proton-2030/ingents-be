import { SchemaDefinitionProperty, Types } from "mongoose";

export interface IChatMessage {
  chatId: SchemaDefinitionProperty<Types.ObjectId>;
  sender: "user" | "bot";
  content: string;
}
