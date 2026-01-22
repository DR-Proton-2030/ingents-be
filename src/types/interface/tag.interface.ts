import { SchemaDefinitionProperty, Types } from "mongoose";

export interface ITag {
  name: string;
  color: string;
  company_object_id: SchemaDefinitionProperty<Types.ObjectId>;
}
