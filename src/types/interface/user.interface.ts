import { SchemaDefinitionProperty, Types } from "mongoose";

export type UserRole = "company_admin" | "employee" | "manager";
export interface IUser {
  full_name: string;
  email: string;
  password: string;
  emp_id: string;
  company_object_id: SchemaDefinitionProperty<Types.ObjectId>;
  role: UserRole;
  profile_picture: string;
  has_joined: boolean;
  facebook?: {
    project_id: string;
    name: string;
    access_token: string;
  };
  instagram?: {
    project_id: string;
    name: string;
    access_token: string;
    refresh_token?: string;
  };
  youtube?: {
    project_id: string;
    name: string;
    access_token: string;
    refresh_token?: string;
  };
  x?: {
    project_id?: string;
    name?: string;
    access_token?: string;
    refresh_token?: string;
    pkce_verifier?: string | null;
  };
}
