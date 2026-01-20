import { Schema } from "mongoose";
import SCHEMA_DEFINITION_PROPERTY from "../../constants/model/model.constant";
import { GENERAL_SCHEMA_OPTIONS } from "../../constants/model/schemaOption";
import { ITaskPhase } from "../../types/interface/taskPhase.interface";

const taskPhaseSchema: Schema<ITaskPhase> = new Schema<ITaskPhase>(
  {
    name: SCHEMA_DEFINITION_PROPERTY.requiredString,
    index: SCHEMA_DEFINITION_PROPERTY.requiredNumber,
    company_object_id: SCHEMA_DEFINITION_PROPERTY.requiredObjectId,
    is_default: {
      ...SCHEMA_DEFINITION_PROPERTY.requiredBoolean,
      default: false,
    },
    color: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
  },
  {
    ...GENERAL_SCHEMA_OPTIONS,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Index for efficient queries
taskPhaseSchema.index({ company_object_id: 1, index: 1 });
taskPhaseSchema.index({ company_object_id: 1, is_default: 1 });

export default taskPhaseSchema;
