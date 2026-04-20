import { Request, Response } from "express";
import * as assistantService from "../../../../services/ai/virtualAssistant.service";

/**
 * Handle chat messages for the Virtual Assistant
 */
export const chatWithAssistant = async (req: Request, res: Response) => {
    try {
        const userId = req.user._id.toString();
        const { messages, projectContext } = req.body;

        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({
                success: false,
                message: "Messages array is required"
            });
        }

        const result = await assistantService.chatWithAssistant(
            userId,
            messages,
            typeof projectContext === "string" ? projectContext : undefined
        );

        return res.status(200).json({
            success: true,
            data: result
        });
    } catch (error: any) {
        console.error("Virtual Assistant Controller Error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to process AI request",
            error: error.message
        });
    }
};
