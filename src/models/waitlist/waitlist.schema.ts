import { Schema } from "mongoose";
import SCHEMA_DEFINITION_PROPERTY from "../../constants/model/model.constant";
import { GENERAL_SCHEMA_OPTIONS } from "../../constants/model/schemaOption";
import { IWaitlist } from "../../types/interface/waitlist.interface";

const waitListSchema: Schema<IWaitlist> = new Schema<IWaitlist>(
    {
       ip_address: SCHEMA_DEFINITION_PROPERTY.requiredString,
       email: SCHEMA_DEFINITION_PROPERTY.requiredString,
    },
    {
        ...GENERAL_SCHEMA_OPTIONS,
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);

export default waitListSchema;
