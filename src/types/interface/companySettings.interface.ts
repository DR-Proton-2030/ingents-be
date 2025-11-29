import { SchemaDefinitionProperty, Types } from "mongoose";

export interface ICompanySettings {
    company_object_id: SchemaDefinitionProperty<Types.ObjectId>;
    tags: Array<string>;
    agents: Array<string>;
    content: string;
    embedding: Array<number>;
    language: string;
}