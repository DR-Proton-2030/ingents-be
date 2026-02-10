import { Schema } from "mongoose";
import { IChatSession } from "../../types/interface/chatSession.interface";
import { GENERAL_SCHEMA_OPTIONS } from "../../constants/model/schemaOption";
import SCHEMA_DEFINITION_PROPERTY from "../../constants/model/model.constant";
import { IAuthToken } from "../../types/interface/authToken.interface";

export const authTokenSchema: Schema<IAuthToken> = new Schema<IAuthToken>(
  {
    user_object_id: SCHEMA_DEFINITION_PROPERTY.requiredObjectId,
    google: {
        access_token: SCHEMA_DEFINITION_PROPERTY.requiredString,
        refresh_token: SCHEMA_DEFINITION_PROPERTY.requiredString,
        expiry_date: SCHEMA_DEFINITION_PROPERTY.requiredNumber,
    }
  },
  {
    ...GENERAL_SCHEMA_OPTIONS,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);
