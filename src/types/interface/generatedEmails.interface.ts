import { SchemaDefinitionProperty, Types } from "mongoose";

export interface IGeneratedEmails {
  userId : SchemaDefinitionProperty<Types.ObjectId>;
  uploaded_company_id: SchemaDefinitionProperty<Types.ObjectId>;
  email_sub : string;
  email_body : string;
  date: Date;
}
