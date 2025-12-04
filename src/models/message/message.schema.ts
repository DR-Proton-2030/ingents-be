import { Schema } from "mongoose";
import { GENERAL_SCHEMA_OPTIONS } from "../../constants/model/schemaOption";
import SCHEMA_DEFINITION_PROPERTY from "../../constants/model/model.constant";
import { IChatMessage } from "../../types/interface/message.interface";

export const messageSchema: Schema<IChatMessage> =
  new Schema<IChatMessage>(
    {
        chatId : SCHEMA_DEFINITION_PROPERTY.requiredObjectId,
        sender: SCHEMA_DEFINITION_PROPERTY.requiredString,
        content: SCHEMA_DEFINITION_PROPERTY.requiredString,
        files: [SCHEMA_DEFINITION_PROPERTY.optionalNullString],
    },
    {
      ...GENERAL_SCHEMA_OPTIONS,
      toJSON: { virtuals: true },
      toObject: { virtuals: true },
    }
  );