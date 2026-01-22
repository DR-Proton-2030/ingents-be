import { SchemaDefinitionProperty, Types } from "mongoose";

export interface IProject {
  name: string;
  detail: string;
  company_object_id: SchemaDefinitionProperty<Types.ObjectId>;
  created_by_user_object_id: SchemaDefinitionProperty<Types.ObjectId>;
}