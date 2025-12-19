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
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMessage = void 0;
const Agent_factory_1 = require("../../../../factory/Agent.factory");
const messages_service_1 = require("../../../../services/messgaes/messages.service");
const sendMessage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { message, files, chatId } = req.body;
        const { _id, company_object_id } = req.user;
        const agentFactory = new Agent_factory_1.AgentFactory();
        let messgaeHistory = [];
        let chatObjectId = chatId;
        let supportedFiles = [];
        if (files) {
            if (Array.isArray(files)) {
                supportedFiles = files;
            }
            else if (typeof files === "string") {
                supportedFiles = [files];
            }
        }
        if (chatObjectId) {
            messgaeHistory = yield (0, messages_service_1.getMessgaeHistoryByChatId)(chatObjectId, 10);
        }
        console.log("message history", messgaeHistory);
        const promptMessage = message +
            (supportedFiles ? `\n\nSupported files: ${supportedFiles.join(", ")}` : "") +
            (messgaeHistory.length > 0
                ? `\n\nPrevious messages in this chat:\n${messgaeHistory
                    .map((msg) => `${msg.sender === "user" ? "User" : "Agent"}: ${msg.content,
                    " files: " + (msg.files ? msg.files.join(", ") : "None")}`)
                    .join("\n")}`
                : "");
        console.log("prompt is ", promptMessage);
        if (!chatObjectId) {
            const newMessage = yield (0, messages_service_1.saveMessage)("user", message, _id.toString(), undefined, supportedFiles);
            chatObjectId = newMessage.chatId;
        }
        else {
            yield (0, messages_service_1.saveMessage)("user", message, _id.toString(), chatObjectId, supportedFiles);
        }
        const result = yield agentFactory.createAgentForUser(promptMessage, String(company_object_id));
        // Save bot response with content and files
        yield (0, messages_service_1.saveMessage)("bot", result.content || "Task completed successfully", _id.toString(), chatObjectId, result.files || []);
        res.status(200).json({
            message: "Task completed successfully",
            data: result,
        });
    }
    catch (error) {
        console.error("Error in sendMessage:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});
exports.sendMessage = sendMessage;
