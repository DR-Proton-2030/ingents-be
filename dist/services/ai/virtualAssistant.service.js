"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
exports.chatWithAssistant = void 0;
const openai_1 = __importDefault(require("openai"));
const config_1 = require("../../config/config");
const composioService = __importStar(require("../composio/composio.service"));
const openai = new openai_1.default({
    apiKey: config_1.OPEN_AI_API_KEY,
});
const MAX_TOOL_ROUNDS = 6;
const sanitizeMessages = (messages) => {
    if (!Array.isArray(messages))
        return [];
    return messages
        .filter((message) => {
        if (!message || typeof message !== "object")
            return false;
        const candidate = message;
        return (typeof candidate.content === "string" &&
            ["system", "user", "assistant"].includes(candidate.role));
    })
        .map((message) => ({
        role: message.role,
        content: message.content,
    }));
};
const buildSystemPrompt = (connectedApps, projectContext) => {
    const connected = connectedApps.length > 0 ? connectedApps.join(", ") : "none";
    const projectLine = projectContext
        ? `Current project context ID: ${projectContext}. Prioritize this context for all actions.`
        : "No explicit project context provided.";
    return [
        "You are the Ingents Virtual Assistant.",
        "Use Composio tools whenever a user asks to take action in external apps.",
        "If a user is not connected to a required app, explain what to connect and why.",
        `Connected apps: ${connected}.`,
        projectLine,
        "Keep replies concise, clear, and action-focused.",
    ].join(" ");
};
/**
 * Handle a chat request with the Virtual Assistant.
 * It uses OpenAI for reasoning and Composio for tool execution.
 */
const chatWithAssistant = (userId, messages, projectContext) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e;
    try {
        if (!config_1.OPEN_AI_API_KEY) {
            throw new Error("OPEN_AI_API_KEY is not defined in environment variables.");
        }
        const composio = composioService.getComposioInstance();
        const scopedComposioUserId = composioService.buildScopedComposioUserId(userId, projectContext);
        const session = yield composioService.createComposioSession(userId, projectContext);
        const [toolState, tools] = yield Promise.all([
            session.toolkits({ limit: 50 }),
            session.tools(),
        ]);
        const connectedApps = toolState.items
            .filter((toolkit) => { var _a; return (_a = toolkit.connection) === null || _a === void 0 ? void 0 : _a.isActive; })
            .map((toolkit) => toolkit.slug);
        const userMessages = sanitizeMessages(messages);
        if (userMessages.length === 0) {
            userMessages.push({
                role: "user",
                content: "Summarize my current project status and suggest next actions.",
            });
        }
        const conversation = [
            {
                role: "system",
                content: buildSystemPrompt(connectedApps, projectContext),
            },
            ...userMessages,
        ];
        let response = yield openai.chat.completions.create({
            model: "gpt-4o",
            messages: conversation,
            tools: tools,
            tool_choice: "auto",
        });
        const usedTools = new Set();
        let rounds = 0;
        while (((_c = (_b = (_a = response.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.tool_calls) === null || _c === void 0 ? void 0 : _c.length) && rounds < MAX_TOOL_ROUNDS) {
            rounds += 1;
            const toolCalls = response.choices[0].message.tool_calls;
            toolCalls.forEach((toolCall) => {
                if (toolCall.type === "function") {
                    usedTools.add(toolCall.function.name);
                }
                else if (toolCall.type === "custom") {
                    usedTools.add(toolCall.custom.name);
                }
            });
            const toolResults = yield composio.provider.handleToolCalls(scopedComposioUserId, response);
            conversation.push(response.choices[0].message);
            for (const [index, toolCall] of toolCalls.entries()) {
                conversation.push({
                    role: "tool",
                    tool_call_id: toolCall.id,
                    content: JSON.stringify(toolResults[index] || {}),
                });
            }
            response = yield openai.chat.completions.create({
                model: "gpt-4o",
                messages: conversation,
                tools: tools,
                tool_choice: "auto",
            });
        }
        const assistantMessage = ((_e = (_d = response.choices[0]) === null || _d === void 0 ? void 0 : _d.message) === null || _e === void 0 ? void 0 : _e.content) ||
            "I could not generate a response. Please try again.";
        return {
            message: assistantMessage,
            requiresAction: usedTools.size > 0,
            usedTools: Array.from(usedTools),
            connectedApps,
        };
    }
    catch (error) {
        console.error("AI Assistant Error:", error);
        throw error;
    }
});
exports.chatWithAssistant = chatWithAssistant;
