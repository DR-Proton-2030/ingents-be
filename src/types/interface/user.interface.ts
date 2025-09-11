import { SchemaDefinitionProperty, Types } from "mongoose";

export interface IUser {
	full_name: string;
	email: string;
	password: string;
	emp_id: string;
	company_object_id: SchemaDefinitionProperty<Types.ObjectId>;
	role: string;
	profile_picture: string;
}
