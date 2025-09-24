import { ClientSession, Types } from "mongoose";
import UserChatHistoryModel from "../models/userChatHistory/userChatHistory.model";

export const saveChatHistory = async (
  userId: Types.ObjectId,
  uploadedCompanyId: Types.ObjectId,
  prompt: string,
  body: string,
  session: ClientSession
) => {
  const existingChatHistory = await UserChatHistoryModel.findOne({ userId }).session(session);

  const message = {
    role: "system" as "system",
    request: prompt,
    response: body,
    createdAt: new Date(),
  };

  if (existingChatHistory) {
    existingChatHistory.messages.push(message);
    return existingChatHistory.save({ session });
  } else {
    return new UserChatHistoryModel({
      userId,
      uploaded_company_id: uploadedCompanyId,
      messages: [message],
    }).save({ session });
  }
};
