import { Schema } from "mongoose";
import { IUserChatHistory } from "../../types/interface/userChatHistory.interface";
import SCHEMA_DEFINITION_PROPERTY from "../../constants/model/model.constant";
import { GENERAL_SCHEMA_OPTIONS } from "../../constants/model/schemaOption";

export const userChatHistorySchema: Schema<IUserChatHistory> = new Schema<IUserChatHistory>(
    {
        userId : SCHEMA_DEFINITION_PROPERTY.requiredObjectId,
        uploaded_company_id : SCHEMA_DEFINITION_PROPERTY.requiredObjectId,
        messages: [
            {
                role: {
                    type: String,
                    enum: ["user", "system"],
                    required: true
                },
                request : SCHEMA_DEFINITION_PROPERTY.requiredString,
                response: SCHEMA_DEFINITION_PROPERTY.requiredString,
            }
        ]
        
    },
    {
       ...GENERAL_SCHEMA_OPTIONS,
            toJSON: { virtuals: true },
            toObject: { virtuals: true } 
    }
);