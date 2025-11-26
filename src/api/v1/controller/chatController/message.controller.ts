import { Request, Response } from "express";
import { bulkEmailFromExcel } from "../../../../services/agents/email/bulkEmailFromExcel.service";
import { ChatService } from "../../../../services/chat/chat.service";
import UserModel from "../../../../models/users/users.model";

export const sendMessage = async (req: Request, res: Response) => {
  try {
    const { message } = req.body;
    const chatService = new ChatService();

    const intent = await chatService.getIntentCode(message);

    res.status(200).json({
      message: "Intent determined successfully",
      data: intent,
    });
  } catch (error) {
    console.error("Error in sendMessage:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
