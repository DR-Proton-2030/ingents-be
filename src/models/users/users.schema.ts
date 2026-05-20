import { Schema, VirtualTypeOptions } from "mongoose";
import SCHEMA_DEFINITION_PROPERTY from "../../constants/model/model.constant";
import { GENERAL_SCHEMA_OPTIONS } from "../../constants/model/schemaOption";
import { IUser } from "../../types/interface/user.interface";
import { ICompany } from "../../types/interface/company.interface";
import { USER_ROLES } from "../../constants/role";

const userSchema = new Schema(
  {
    full_name: SCHEMA_DEFINITION_PROPERTY.requiredString,
    email: { ...SCHEMA_DEFINITION_PROPERTY.requiredString, unique: true },
    company_object_id: SCHEMA_DEFINITION_PROPERTY.requiredObjectId,
    has_joined: {
      type: Boolean,
      required: true,
      default: false,
    },
    role: { ...SCHEMA_DEFINITION_PROPERTY.requiredString, enum: USER_ROLES },
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
    x: {
      project_id: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
      name: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
      access_token: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
      refresh_token: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
      pkce_verifier: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
    },
    whatsapp: {
      phone_number_id: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
      access_token: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
      waba_id: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
    },
    memories: SCHEMA_DEFINITION_PROPERTY.optionalArray,
    memory: {
      type: [
        {
          text: { type: String, required: true },
          createdAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
  },
  {
    ...GENERAL_SCHEMA_OPTIONS,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

const CompanyVirtualReference: VirtualTypeOptions<ICompany> = {
  ref: "companies",
  localField: "company_object_id",
  foreignField: "_id",
  justOne: true,
};

userSchema.virtual("company_details", CompanyVirtualReference);

export default userSchema;
