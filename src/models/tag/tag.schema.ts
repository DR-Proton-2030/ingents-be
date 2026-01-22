import { Schema } from "mongoose";
import { GENERAL_SCHEMA_OPTIONS } from "../../constants/model/schemaOption";
import SCHEMA_DEFINITION_PROPERTY from "../../constants/model/model.constant";
import { ITag } from "../../types/interface/tag.interface";

export const tagSchema: Schema<ITag> = new Schema<ITag>(
  {
    name: SCHEMA_DEFINITION_PROPERTY.requiredString,
    color: {
      type: String,
      required: true,
      default: "#3B82F6",
    },
    company_object_id: SCHEMA_DEFINITION_PROPERTY.requiredObjectId,
  },
  GENERAL_SCHEMA_OPTIONS,
);
