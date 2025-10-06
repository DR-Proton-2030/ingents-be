import { Server } from "socket.io";
import type { Server as HttpServer } from "http";
import ChatMessageModel from "../models/message/message.model";
import { getOpenAIResponse } from "../utils/openai";

export default function initSocket(server: HttpServer) {
  const io = new Server(server, {
    cors: {
      origin: "http://localhost:3000",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log("✅ Socket connected:", socket.id);

    socket.on("joinRoom", (chatId: string) => {
      socket.join(chatId);
      console.log(`${socket.id} joined chat: ${chatId}`);
    });

    socket.on("sendMessage", async ({ chatId, msg, userId }) => {
      try {
        // 1️⃣ Save user message
        const userMessage = await ChatMessageModel.create({
          chatId,
          sender: "user",
          content: msg,
        });

        // 2️⃣ Emit user message to room
        io.to(chatId).emit("message", userMessage);

        // 3️⃣ Get bot response from OpenAI
        const botReply = await getOpenAIResponse(msg);

        // 4️⃣ Save bot message
        const botMessage = await ChatMessageModel.create({
          chatId,
          sender: "bot",
          content: botReply,
        });

        // 5️⃣ Emit bot reply
        io.to(chatId).emit("message", botMessage);
      } catch (err) {
        console.error("Error handling message:", err);
      }
    });

    socket.on("disconnect", () => {
      console.log("❌ Socket disconnected:", socket.id);
    });
  });

  return io;
}
