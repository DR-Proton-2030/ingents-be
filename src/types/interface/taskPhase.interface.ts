import { SchemaDefinitionProperty, Types } from "mongoose";

export interface ITaskPhase {
  name: string;
  index: number;
  company_object_id: SchemaDefinitionProperty<Types.ObjectId>;
  is_default: boolean;
  color?: string;
}
