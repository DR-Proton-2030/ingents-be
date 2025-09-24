import { SchemaDefinitionProperty, Types } from "mongoose";

export interface IMessage {
  role: "user" | "system";
  request: string;
  response: string;
}


export interface IUserChatHistory {
  userId: SchemaDefinitionProperty<Types.ObjectId>; 
  uploaded_company_id: SchemaDefinitionProperty<Types.ObjectId>; 
  messages: IMessage[];
}