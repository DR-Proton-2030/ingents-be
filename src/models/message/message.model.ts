import { model } from "mongoose";
import { IChatMessage } from "../../types/interface/message.interface";
import { chatMessageSchema } from "./message.schema";

const ChatMessageModel = model<IChatMessage>("chat_message", chatMessageSchema);

export default ChatMessageModel;