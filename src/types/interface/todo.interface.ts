import { Types } from "mongoose";

export interface ITodo {
  user_object_id: Types.ObjectId;
  company_object_id: Types.ObjectId;
  text: string;
  completed: boolean;
  date: string; // YYYY-MM-DD format
}
