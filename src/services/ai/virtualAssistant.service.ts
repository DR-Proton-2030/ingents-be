import OpenAI from "openai";
import { OPEN_AI_API_KEY } from "../../config/config";
import * as composioService from "../composio/composio.service";

const openai = new OpenAI({
    apiKey: OPEN_AI_API_KEY,
});

const MAX_TOOL_ROUNDS = 6;

type InboundMessage = {
    role: "system" | "user" | "assistant";
    content: string;
};

const sanitizeMessages = (messages: unknown[]): OpenAI.Chat.ChatCompletionMessageParam[] => {
    if (!Array.isArray(messages)) return [];

    return messages
        .filter((message): message is InboundMessage => {
            if (!message || typeof message !== "object") return false;
            const candidate = message as InboundMessage;
            return (
                typeof candidate.content === "string" &&
                ["system", "user", "assistant"].includes(candidate.role)
            );
        })
        .map((message) => ({
            role: message.role,
            content: message.content,
        }));
};

const buildSystemPrompt = (connectedApps: string[], projectContext?: string) => {
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
export const chatWithAssistant = async (
    userId: string,
    messages: unknown[],
    projectContext?: string
) => {
    try {
        if (!OPEN_AI_API_KEY) {
            throw new Error("OPEN_AI_API_KEY is not defined in environment variables.");
        }

        const composio = composioService.getComposioInstance();
        const scopedComposioUserId = composioService.buildScopedComposioUserId(
            userId,
            projectContext
        );
        const session = await composioService.createComposioSession(userId, projectContext);

        const [toolState, tools] = await Promise.all([
            session.toolkits({ limit: 50 }),
            session.tools(),
        ]);

        const connectedApps = toolState.items
            .filter((toolkit) => toolkit.connection?.isActive)
            .map((toolkit) => toolkit.slug);

        const userMessages = sanitizeMessages(messages);
        if (userMessages.length === 0) {
            userMessages.push({
                role: "user",
                content: "Summarize my current project status and suggest next actions.",
            });
        }

        const conversation: OpenAI.Chat.ChatCompletionMessageParam[] = [
            {
                role: "system",
                content: buildSystemPrompt(connectedApps, projectContext),
            },
            ...userMessages,
        ];

        let response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: conversation,
            tools: tools as any,
            tool_choice: "auto",
        });

        const usedTools = new Set<string>();
        let rounds = 0;

        while (response.choices[0]?.message?.tool_calls?.length && rounds < MAX_TOOL_ROUNDS) {
            rounds += 1;
            const toolCalls = response.choices[0].message.tool_calls;

            toolCalls.forEach((toolCall) => {
                if (toolCall.type === "function") {
                    usedTools.add(toolCall.function.name);
                } else if (toolCall.type === "custom") {
                    usedTools.add(toolCall.custom.name);
                }
            });

            const toolResults = await (composio.provider as any).handleToolCalls(
                scopedComposioUserId,
                response
            );

            conversation.push(response.choices[0].message as any);

            for (const [index, toolCall] of toolCalls.entries()) {
                conversation.push({
                    role: "tool",
                    tool_call_id: toolCall.id,
                    content: JSON.stringify(toolResults[index] || {}),
                });
            }

            response = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: conversation,
                tools: tools as any,
                tool_choice: "auto",
            });
        }

        const assistantMessage =
            response.choices[0]?.message?.content ||
            "I could not generate a response. Please try again.";

        return {
            message: assistantMessage,
            requiresAction: usedTools.size > 0,
            usedTools: Array.from(usedTools),
            connectedApps,
        };
    } catch (error: any) {
        console.error("AI Assistant Error:", error);
        throw error;
    }
};
