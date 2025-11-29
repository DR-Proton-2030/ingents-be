import { Request, Response } from "express";
import { AgentFactory } from "../../../../factory/Agent.factory";

export const sendMessage = async (req: Request, res: Response) => {
  try {
    const { message } = req.body;
    const agentFactory = new AgentFactory();

    const intent = await agentFactory.decideAgentCode(message);

    res.status(200).json({
      message: "Intent determined successfully",
      data: intent,
    });
  } catch (error) {
    console.error("Error in sendMessage:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
