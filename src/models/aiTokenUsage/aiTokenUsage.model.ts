import { model } from "mongoose";
import { IAITokenUsage } from "../../types/interface/aiTokenUsage.interface";
import { aiTokenUsageSchema } from "./aiTokenUsage.schema";

const AITokenUsageModel = model<IAITokenUsage>("ai_token_usages", aiTokenUsageSchema);

export default AITokenUsageModel;
