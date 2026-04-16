import { Types } from "mongoose";

export type ActivityType =
  | "TASK_CREATED"
  | "TASK_COMPLETED"
  | "TASK_ASSIGNED"
  | "TASK_DELETED"
  | "MEETING_CREATED"
  | "MEETING_RSVP"
  | "MEETING_DELETED"
  | "POST_SCHEDULED"
  | "POST_PUBLISHED"
  | "SOCIAL_POSTED"
  | "CAMPAIGN_CREATED"
  | "CAMPAIGN_UPDATED"
  | "CAMPAIGN_DELETED";

export interface IActivityLog {
  company_object_id: Types.ObjectId;
  actor_object_id: Types.ObjectId;
  actor_name: string;
  activity_type: ActivityType;
  message: string;
  metadata?: Record<string, any>;
}
