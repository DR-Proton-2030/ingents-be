import { SchemaDefinitionProperty, Types } from "mongoose";

export interface IAuthToken {
    company_object_id: SchemaDefinitionProperty<Types.ObjectId>;
    google:{
        access_token: string;
        refresh_token: string;
        expiry_date: number;
    }
}