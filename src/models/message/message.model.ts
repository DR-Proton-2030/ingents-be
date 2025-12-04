import { model } from "mongoose";
import { IChatMessage } from "../../types/interface/message.interface";
import { messageSchema } from "./message.schema";

const MessageModel = model<IChatMessage>("messages", messageSchema);

export default MessageModel;