import { SchemaDefinitionProperty, Types } from "mongoose";
import { ITaskPhase } from "./taskPhase.interface";
import { ITag } from "./tag.interface";

export type TaskPriority = "urgent" | "normal" | "low";

export interface TaskAttachment {
  url: string;
  description?: string;
}

export interface Task {
  title: string;
  completed: boolean;
  description?: string;
  parent_task_object_id: SchemaDefinitionProperty<Types.ObjectId> | null;
  due_date?: Date;
  priority: TaskPriority;
  progress: number;
  subtaskCount?: number;
  commentCount?: number;
  phase_object_id: SchemaDefinitionProperty<Types.ObjectId>;
  completed_at?: Date;
  created_by_user_object_id: SchemaDefinitionProperty<Types.ObjectId>;
  completed_by_user_object_id?: SchemaDefinitionProperty<Types.ObjectId>;
  company_object_id: SchemaDefinitionProperty<Types.ObjectId>;
  assigned_user_list?: SchemaDefinitionProperty<Types.ObjectId>[];
  assigned_users_info?: {
    full_name: string;
    email?: string;
  }[];
  attachments?: TaskAttachment[];
  tag_object_ids?: SchemaDefinitionProperty<Types.ObjectId>[];
  tags_info?: ITag[];
  project_object_id?: SchemaDefinitionProperty<Types.ObjectId> | null;
}
