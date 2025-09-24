import { SchemaDefinitionProperty, Types } from "mongoose";

export interface IUploadedCompany {
  _id?: string;
  company_name: string;
  company_industry: string;
  no_of_employees : string;
  type: string;
  role : string;
  company_email: string;
  company_website: string;
  contact_number: string;
}

export interface IUserUploadedCompanies {
  userId: SchemaDefinitionProperty<Types.ObjectId>;
  companies: IUploadedCompany[];
}
