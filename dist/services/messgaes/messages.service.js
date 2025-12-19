"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveMessage = exports.getMessgaeHistoryByChatId = void 0;
const openai_adapter_1 = require("../../adapter/llm/openai.adapter");
const chatSession_model_1 = __importDefault(require("../../models/chatSession/chatSession.model"));
const message_model_1 = __importDefault(require("../../models/message/message.model"));
const getMessgaeHistoryByChatId = (chatId, limit, skip) => __awaiter(void 0, void 0, void 0, function* () {
    const messages = yield message_model_1.default.find({ chatId }).sort({ createdAt: 1 }).limit(limit);
    return messages;
});
exports.getMessgaeHistoryByChatId = getMessgaeHistoryByChatId;
const saveMessage = (sender, content, userId, chatId, files) => __awaiter(void 0, void 0, void 0, function* () {
    let chatObjectId = chatId;
    if (!chatId) {
        const response = yield (0, openai_adapter_1.generateOpenAiResponse)(content, `You are an AI assistant for business automation.
            Your job is to generate a short title for the following message content that can be used as a chat session title.
            Respond with json {title:<string>}.`);
        if (!response) {
            throw new Error("Failed to generate chat session title");
        }
        const payload = {
            userId,
            title: response.parsedContent.title || "New Chat Session",
        };
        const newChat = yield new chatSession_model_1.default(payload).save();
        chatObjectId = newChat._id.toString();
    }
    const messagePayload = {
        chatId: String(chatObjectId),
        sender,
        content,
        files
    };
    const newMessage = yield new message_model_1.default(messagePayload).save();
    return newMessage;
});
exports.saveMessage = saveMessage;
