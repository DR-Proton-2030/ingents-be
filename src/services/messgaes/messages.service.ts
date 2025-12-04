import { generateOpenAiResponse } from "../../adapter/llm/openai.adapter";
import ChatSessionModel from "../../models/chatSession/chatSession.model";
import MessageModel from "../../models/message/message.model"
import { IChatSession } from "../../types/interface/chatSession.interface";
import { IChatMessage } from "../../types/interface/message.interface";

export const getMessgaeHistoryByChatId = async (chatId: string, limit: number, skip?: number): Promise<IChatMessage[]> => {
    const messages = await MessageModel.find({chatId}).sort({createdAt: 1}).limit(limit);
    return messages;
}

export const saveMessage = async (sender: "user" | "bot", content: string, userId: string, chatId?: string, files?: string[]): Promise<IChatMessage> => {
    let chatObjectId = chatId;
    if(!chatId) {
        const response = await generateOpenAiResponse(
            content,
            `You are an AI assistant for business automation.
            Your job is to generate a short title for the following message content that can be used as a chat session title.
            Respond with json {title:<string>}.`
        );

        if(!response) {
            throw new Error("Failed to generate chat session title");
        }
        const payload : IChatSession = {
            userId,
            title: response.parsedContent.title || "New Chat Session",
        }
        const newChat = await new ChatSessionModel(payload).save();
        chatObjectId = newChat._id.toString();
    }
    const messagePayload : IChatMessage= {
        chatId: String(chatObjectId),
        sender,
        content,
        files
    }
    const newMessage = await new MessageModel(messagePayload).save();
    
    return newMessage;
}