import { Schema } from "mongoose";
import SCHEMA_DEFINITION_PROPERTY from "../../constants/model/model.constant";
import { GENERAL_SCHEMA_OPTIONS } from "../../constants/model/schemaOption";
import { ICompany } from "../../types/interface/company.interface";

const companySchema: Schema<ICompany> = new Schema<ICompany>(
	{
		company_name: SCHEMA_DEFINITION_PROPERTY.requiredString,
		website: SCHEMA_DEFINITION_PROPERTY.requiredString,
		logo: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
		address: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
		phone_number: SCHEMA_DEFINITION_PROPERTY.requiredString,
		industry: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
		company_size: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
		contact_email: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
		founding_year: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
		description: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
		products: SCHEMA_DEFINITION_PROPERTY.optionalArray,
		sector: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
		services: SCHEMA_DEFINITION_PROPERTY.optionalArray,
	},
	{
		...GENERAL_SCHEMA_OPTIONS,
		toJSON: { virtuals: true },
		toObject: { virtuals: true }
	}
);

export default companySchema;
