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
    const { _id, company_object_id } = req.user;

    console.log('boddy', req.body);

    const agentFactory = new AgentFactory();
    let messgaeHistory: IChatMessage[] = [];
    let chatObjectId = chatId;

    let supportedFiles: string[] = [];
    if (files) {
      if (Array.isArray(files)) {
        supportedFiles = files;
      } else if (typeof files === "string") {
        supportedFiles = [files];
      }
    }

    if (chatObjectId) {
      messgaeHistory = await getMessgaeHistoryByChatId(chatObjectId, 10);
    }

    console.log("message history", messgaeHistory);

    const promptMessage =
      message +
      (supportedFiles ? `\n\nSupported files: ${supportedFiles.join(", ")}` : "") +
      (messgaeHistory.length > 0
        ? `\n\nPrevious messages in this chat:\n${messgaeHistory
            .map(
              (msg: any) =>
                `${msg.sender === "user" ? "User" : "Agent"}: ${
                  msg.content,
                  " files: " + (msg.files ? msg.files.join(", ") : "None")
                }`
            )
            .join("\n")}`
        : "");

    console.log("prompt is ", promptMessage);
    if (!chatObjectId) {
      const newMessage = await saveMessage(
        "user",
        message,
        _id.toString(),
        undefined,
        supportedFiles
      );
      chatObjectId = newMessage.chatId;
    } else{
      await saveMessage(
        "user",
        message,
        _id.toString(),
        chatObjectId,
        supportedFiles
      );
    }

    const result = await agentFactory.createAgentForUser(
      promptMessage,
      String(company_object_id)
    );

    // Save bot response with content and files
    await saveMessage(
      "bot",
      result.content || "Task completed successfully",
      _id.toString(),
      chatObjectId,
      result.files || []
    );

    res.status(200).json({
      message: "Task completed successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error in sendMessage:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
