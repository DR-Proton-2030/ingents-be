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
exports.getOpenAIResponse = void 0;
const openai_1 = __importDefault(require("openai"));
const client = new openai_1.default({ apiKey: process.env.OPEN_AI_API_KEY });
function getOpenAIResponse(userMessage) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        try {
            const completion = yield client.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [{ role: "user", content: userMessage }],
            });
            return ((_b = (_a = completion.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) || "Sorry, I didn’t get that.";
        }
        catch (error) {
            console.error("OpenAI error:", error);
            return "There was an error processing your request.";
        }
    });
}
exports.getOpenAIResponse = getOpenAIResponse;
