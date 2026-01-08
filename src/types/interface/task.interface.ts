import { SchemaDefinitionProperty, Types } from "mongoose";
import { TASK_STATUSES } from "../../constants/taskStatus/taskStatus";

export type TaskPriority = "urgent" | "normal" | "low";
export type TaskStatus =
  typeof TASK_STATUSES[keyof typeof TASK_STATUSES];

// export type TaskStatus =
//   | "in-progress"
//   | "ready-to-check"
//   | "completed"
//   | "backlog";

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
  status: TaskStatus;
  completed_at?: Date;
  created_by_user_object_id: SchemaDefinitionProperty<Types.ObjectId>;
  completed_by_user_object_id?: SchemaDefinitionProperty<Types.ObjectId>;
  company_object_id: SchemaDefinitionProperty<Types.ObjectId>;
  assigned_user_list?: SchemaDefinitionProperty<Types.ObjectId>[];
  assigned_users_info?: {
    full_name: string;
    email?: string;
  }[];
  
}
