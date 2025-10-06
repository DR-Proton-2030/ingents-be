import { Request, Response } from "express";
import mongoose, { Types } from "mongoose";
import ChatSessionModel from "../../../../models/chatSession/chatSession.model";
import ChatMessageModel from "../../../../models/message/message.model";
import { handleUploadedFile } from "../fileHandling/fileHandling.controller";


export const sendMessage = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const userId = new Types.ObjectId(req.user._id);
    const { chatId, sender, content, files, fileUrl } = req.body;

    const chat = await ChatSessionModel.findOne({ _id: chatId, userId });
    if (!chat) return res.status(403).json({ error: "Access denied" });

    if ((files && files.length > 0) || fileUrl) {
      if (files && files.length > 0) {
        const firstFile = files[0];
        req.file = {
          fieldname: "file",
          originalname: firstFile.name,
          mimetype: firstFile.type,
          buffer: Buffer.from(firstFile.data, "base64"),
          size: firstFile.size,
        } as any;
      }

      req.body.chatId = chatId;
      req.body.sender = sender;

      const result = await handleUploadedFile(req, res);
      await session.commitTransaction();
      return result;
    }

    const message = await ChatMessageModel.create(
      [{ chatId, sender, content, files: [] }],
      { session }
    );

    if (!chat.title || chat.title === "New Chat") {
      if (sender === "user") {
        chat.title = content.slice(0, 50);
        await chat.save({ session });
      }
    }

    await session.commitTransaction();
    return res.status(201).json(message[0]);
  } catch (err) {
    console.error("Error sending message:", err);
    await session.abortTransaction();
    return res.status(500).json({ error: "Failed to send message" });
  } finally {
    session.endSession();
  }
};
