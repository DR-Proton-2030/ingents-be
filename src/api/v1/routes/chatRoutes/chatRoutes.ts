

import { Router } from "express";

import {
  createChatSession,
  getUserChats,
  getChatMessages,
} from "../../controller/chatController/chat.controller" 
import { userAuth } from "../../middlewares/auth/userAuth";
import { sendMessage } from "../../controller/chatController/message.controller";

export const chatRouter = Router();

// Create a new chat session (requires authentication)
chatRouter.post("/new", userAuth, createChatSession);

// Get all chat sessions for the authenticated user
chatRouter.get("/", userAuth, getUserChats);

// Get all messages for a specific chat session (chronologically sorted)
chatRouter.get("/:chatId/messages", userAuth, getChatMessages);

// Send a message in a specific chat session
chatRouter.post("/send-message", userAuth, sendMessage);
