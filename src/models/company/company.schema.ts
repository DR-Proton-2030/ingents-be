import { Schema } from "mongoose";
import SCHEMA_DEFINITION_PROPERTY from "../../constants/model/model.constant";
import { GENERAL_SCHEMA_OPTIONS } from "../../constants/model/schemaOption";
import { ICompany } from "../../types/interface/company.interface";

const companySchema: Schema<ICompany> = new Schema<ICompany>(
	{
		company_name: SCHEMA_DEFINITION_PROPERTY.requiredString,
		website: SCHEMA_DEFINITION_PROPERTY.requiredString,
		logo: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
		
	},
	{
		...GENERAL_SCHEMA_OPTIONS,
		toJSON: { virtuals: true },
		toObject: { virtuals: true }
	}
);

export default companySchema;
