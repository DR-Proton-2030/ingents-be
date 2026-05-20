import { Request, Response } from "express";
import * as memoryService from "../../../../services/memory/memory.service";

/**
 * GET /api/v1/memory
 * Fetch all memories of the logged-in user
 */
export const getMemories = async (req: Request, res: Response) => {
  try {
    const userId = req.user._id;
    console.log("[memory] getMemories called for userId:", userId);

    const memories = await memoryService.getMemories(userId);

    return res.status(200).json({
      success: true,
      message: "Memories fetched successfully",
      data: memories,
    });
  } catch (error: any) {
    console.error("[memory] getMemories error:", error.message, error.stack);
    return res.status(500).json({
      success: false,
      message: error.message || "Something went wrong",
    });
  }
};

/**
 * POST /api/v1/memory
 * Add a new memory
 * Body: { text: string }
 */
export const addMemory = async (req: Request, res: Response) => {
  try {
    const userId = req.user._id;
    const { text } = req.body;

    if (!text || typeof text !== "string" || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: "text is required and must be a non-empty string",
      });
    }

    const memories = await memoryService.addMemory(userId, text.trim());

    return res.status(201).json({
      success: true,
      message: "Memory added successfully",
      data: memories,
    });
  } catch (error: any) {
    console.error("[memory] addMemory error:", error.message);
    return res.status(500).json({
      success: false,
      message: error.message || "Something went wrong",
    });
  }
};

/**
 * PUT /api/v1/memory/:id
 * Update an existing memory
 * Body: { text: string }
 */
export const updateMemory = async (req: Request, res: Response) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;
    const { text } = req.body;

    if (!id || id === "undefined" || id === "null") {
      return res.status(400).json({ success: false, message: "Valid Memory ID is required" });
    }

    if (!text || typeof text !== "string" || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: "text is required and must be a non-empty string",
      });
    }

    const memories = await memoryService.updateMemory(userId, id, text.trim());

    return res.status(200).json({
      success: true,
      message: "Memory updated successfully",
      data: memories,
    });
  } catch (error: any) {
    console.error("[memory] updateMemory error:", error.message);
    const status = error.message.includes("not found") ? 404 : 500;
    return res.status(status).json({
      success: false,
      message: error.message || "Something went wrong",
    });
  }
};

/**
 * DELETE /api/v1/memory/:id
 * Delete a memory
 */
export const deleteMemory = async (req: Request, res: Response) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    if (!id || id === "undefined" || id === "null") {
      return res.status(400).json({
        success: false,
        message: "Valid Memory ID is required",
      });
    }

    const memories = await memoryService.deleteMemory(userId, id);

    return res.status(200).json({
      success: true,
      message: "Memory deleted successfully",
      data: memories,
    });
  } catch (error: any) {
    console.error("[memory] deleteMemory error:", error.message);
    const status = error.message.includes("not found") ? 404 : 500;
    return res.status(status).json({
      success: false,
      message: error.message || "Something went wrong",
    });
  }
};
