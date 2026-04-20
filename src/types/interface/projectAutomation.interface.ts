import { Types } from "mongoose";

export type ProjectAutomationType = "github_pr_to_trello";

export interface IProjectAutomation {
  project_object_id: Types.ObjectId;
  company_object_id: Types.ObjectId;
  created_by_user_object_id: Types.ObjectId;
  automation_type: ProjectAutomationType;
  is_active: boolean;
  project_context: string;
  github_repo_owner: string;
  github_repo_name: string;
  github_webhook_secret: string;
  trello_list_id: string;
}
