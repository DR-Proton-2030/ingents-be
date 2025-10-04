import { Request, Response } from "express";
import mongoose, { Types } from "mongoose";
import ChatSessionModel from "../../../../models/chatSession/chatSession.model";
import ChatMessageModel from "../../../../models/message/message.model";

// Send a new message
export const sendMessage = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const userId = new Types.ObjectId(req.user._id);
    const { chatId, sender, content, files } = req.body;

    const chat = await ChatSessionModel.findOne({ _id: chatId, userId });
    if (!chat) return res.status(403).json({ error: "Access denied" });

    // Create new message
    const message = await ChatMessageModel.create(
      [{ chatId, sender, content, files }],
      { session }
    );

    // If this is the first user message, update chat title
    if (!chat.title || chat.title === "New Chat") {
      if (sender === "user") {
        chat.title = content.slice(0, 50); // use first 50 chars as title
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
