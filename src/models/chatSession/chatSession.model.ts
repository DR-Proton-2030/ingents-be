import { model } from "mongoose";
import { IChatSession } from "../../types/interface/chatSession.interface";
import { chatSessionSchema } from "./chatSession.schema";

const ChatSessionModel = model<IChatSession>("chat_session", chatSessionSchema);

export default ChatSessionModel;