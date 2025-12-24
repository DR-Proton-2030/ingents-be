import { Schema, VirtualTypeOptions } from "mongoose";
import SCHEMA_DEFINITION_PROPERTY from "../../constants/model/model.constant";
import { GENERAL_SCHEMA_OPTIONS } from "../../constants/model/schemaOption";
import { IUser } from "../../types/interface/user.interface";
import { ICompany } from "../../types/interface/company.interface";
import { USER_ROLES } from "../../constants/role";

const userSchema: Schema<IUser> = new Schema<IUser>(
  {
    full_name: SCHEMA_DEFINITION_PROPERTY.requiredString,
    email: { ...SCHEMA_DEFINITION_PROPERTY.requiredString, unique: true },
    company_object_id: SCHEMA_DEFINITION_PROPERTY.requiredObjectId,
    has_joined: SCHEMA_DEFINITION_PROPERTY.requiredBoolean,
    role: {...SCHEMA_DEFINITION_PROPERTY.requiredString, enum: USER_ROLES },
    password: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
    emp_id: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
    profile_picture: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
    facebook: {
      project_id: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
      name: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
      access_token: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
    },
    instagram: {
      project_id: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
      name: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
      access_token: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
    },
    youtube: {
      project_id: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
      name: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
      access_token: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
    },
  },
  {
    ...GENERAL_SCHEMA_OPTIONS,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

const CompanyVirtualReference: VirtualTypeOptions<ICompany> = {
  ref: "companies",
  localField: "company_object_id",
  foreignField: "_id",
  justOne: true,
};

userSchema.virtual("company_details", CompanyVirtualReference);

export default userSchema;
