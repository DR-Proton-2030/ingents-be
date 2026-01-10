import { SchemaDefinitionProperty, Types } from "mongoose";

export interface IAssignedTask {
    task_object_id: SchemaDefinitionProperty<Types.ObjectId>;
    assigned_to_user_object_id: SchemaDefinitionProperty<Types.ObjectId>;
    assigned_by_user_object_id: SchemaDefinitionProperty<Types.ObjectId>;
    company_object_id: SchemaDefinitionProperty<Types.ObjectId>;
    assigned_at: Date;
}

export interface AssignedTaskWithUser extends IAssignedTask {
  user_details?: {
    full_name: string;
    email?: string;
  };
};
