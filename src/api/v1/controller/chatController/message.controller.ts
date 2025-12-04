import { Request, Response } from "express";
import { AgentFactory } from "../../../../factory/Agent.factory";
import {
  getMessgaeHistoryByChatId,
  saveMessage,
} from "../../../../services/messgaes/messages.service";
import { IChatMessage } from "../../../../types/interface/message.interface";

export const sendMessage = async (req: Request, res: Response) => {
  try {
    const { message, files, chatId } = req.body;
    const { _id } = req.user;

    const agentFactory = new AgentFactory();
    let messgaeHistory: IChatMessage[] = [];
    let chatObjectId = chatId;

    if (chatObjectId) {
      messgaeHistory = await getMessgaeHistoryByChatId(chatObjectId, 10);
    }

    const promptMessage =
      message +
      (files ? `\n\nSupported files: ${files.join(", ")}` : "") +
      (messgaeHistory.length > 0
        ? `\n\nPrevious messages in this chat:\n${messgaeHistory
            .map(
              (msg: any) =>
                `${msg.sender === _id.toString() ? "User" : "Agent"}: ${
                  msg.content
                }`
            )
            .join("\n")}`
        : "");

    if (!chatObjectId) {
      const newMessage = await saveMessage(
        "user",
        message,
        _id.toString(),
        undefined,
        files
      );
      chatObjectId = newMessage.chatId;
    }

    const intent = await agentFactory.decideAgentCode(promptMessage);

    res.status(200).json({
      message: "Intent determined successfully",
      data: intent,
    });
  } catch (error) {
    console.error("Error in sendMessage:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
