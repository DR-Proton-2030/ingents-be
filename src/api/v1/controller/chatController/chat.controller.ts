import { Request, Response } from "express";
import mongoose, { Types } from "mongoose";
import ChatSessionModel from "../../../../models/chatSession/chatSession.model";
import MessageModel from "../../../../models/message/message.model";

// Create a new chat session with placeholder title
export const createChatSession = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const userId = new Types.ObjectId(req.user._id);

    const chat = await ChatSessionModel.create(
      [{ userId, title: "New Chat" }],
      { session }
    );

    await session.commitTransaction();
    return res.status(201).json(chat[0]);
  } catch (err) {
    console.error("Error creating new chat:", err);
    await session.abortTransaction();
    return res.status(500).json({ error: "Failed to create new chat" });
  } finally {
    session.endSession();
  }
};

// Get all chats for user
export const getUserChats = async (req: Request, res: Response) => {
  try {
    const userId = new Types.ObjectId(req.user._id);
    const chats = await ChatSessionModel.find({ userId })
      .sort({ updatedAt: -1 })
      .lean();
    return res.status(200).json(chats);
  } catch (err) {
    console.error("Error fetching user chats:", err);
    return res.status(500).json({ error: "Failed to fetch chats" });
  }
};

// Get all messages for a chat
export const getChatMessages = async (req: Request, res: Response) => {
  try {
    const userId = new Types.ObjectId(req.user._id);
    const chatId = new Types.ObjectId(req.params.chatId);

    const chat = await ChatSessionModel.findOne({ _id: chatId, userId });
    if (!chat) return res.status(403).json({ error: "Access denied" });

    const messages = await MessageModel.find({ chatId })
      .sort({ createdAt: 1 })
      .lean();

    return res.status(200).json(messages);
  } catch (err) {
    console.error("Error fetching chat messages:", err);
    return res.status(500).json({ error: "Failed to fetch messages" });
  }
};
