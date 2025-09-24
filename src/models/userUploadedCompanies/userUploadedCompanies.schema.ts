import { Schema } from "mongoose";
import {
  IUploadedCompany,
  IUserUploadedCompanies,
} from "../../types/interface/userUploadedCompanies.interface";
import SCHEMA_DEFINITION_PROPERTY from "../../constants/model/model.constant";
import { GENERAL_SCHEMA_OPTIONS } from "../../constants/model/schemaOption";

const UploadedCompanySchema: Schema<IUploadedCompany> =
  new Schema<IUploadedCompany>(
    {
      company_name: SCHEMA_DEFINITION_PROPERTY.requiredString,
      company_industry: SCHEMA_DEFINITION_PROPERTY.requiredString,
	  no_of_employees: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
	  type:SCHEMA_DEFINITION_PROPERTY.optionalNullString,
	  role : SCHEMA_DEFINITION_PROPERTY.optionalNullString,
      company_email: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
      company_website: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
      contact_number: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
    },
    {
      ...GENERAL_SCHEMA_OPTIONS,
      toJSON: { virtuals: true },
      toObject: { virtuals: true },
    }
  );

export const userUploadedCompanySchema: Schema<IUserUploadedCompanies> =
  new Schema<IUserUploadedCompanies>(
    {
      userId: SCHEMA_DEFINITION_PROPERTY.requiredObjectId,
      companies: [UploadedCompanySchema],
    },
    {
      ...GENERAL_SCHEMA_OPTIONS,
      toJSON: { virtuals: true },
      toObject: { virtuals: true },
    }
  );
