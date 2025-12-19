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
exports.saveChatHistory = void 0;
const userChatHistory_model_1 = __importDefault(require("../models/userChatHistory/userChatHistory.model"));
const saveChatHistory = (userId, uploadedCompanyId, prompt, body, session) => __awaiter(void 0, void 0, void 0, function* () {
    const existingChatHistory = yield userChatHistory_model_1.default.findOne({ userId }).session(session);
    const message = {
        role: "system",
        request: prompt,
        response: body,
        createdAt: new Date(),
    };
    if (existingChatHistory) {
        existingChatHistory.messages.push(message);
        return existingChatHistory.save({ session });
    }
    else {
        return new userChatHistory_model_1.default({
            userId,
            uploaded_company_id: uploadedCompanyId,
            messages: [message],
        }).save({ session });
    }
});
exports.saveChatHistory = saveChatHistory;
