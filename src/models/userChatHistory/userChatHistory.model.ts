import { model } from "mongoose";
import { IUserChatHistory } from "../../types/interface/userChatHistory.interface";
import { userChatHistorySchema } from "./userChatHistory.schema";

const UserChatHistoryModel = model<IUserChatHistory>("user_chat_history", userChatHistorySchema);

export default UserChatHistoryModel;