import { Request, Response } from "express";
import { bulkEmailFromExcel } from "../../../../services/agents/email/bulkEmailFromExcel.service";

export const sendMessage = async (req: Request, res: Response) => {
  try {

    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ message: "Excel file is required" });
    }

    const myInfo = {
      my_company_name: req.body.my_company_name || req.user?.company_details?.company_name || "",
      my_company_website: req.body.my_company_website || req.user?.company_details?.company_website || ""
    };

    // Extract processing options from request body
    const userInstructions = (
      req.body.instructions ||
      req.body.emailInstructions ||
      req.body.emailTopic ||
      req.body.prompt ||
      req.body.goal ||
      ""
    ).toString();

    const options = {
      instructions: userInstructions.trim() || undefined,
      scrapeWebsites: req.body.scrapeWebsites !== false,
      maxConcurrentRequests: Number(req.body.maxConcurrentRequests) || 5
    };

    const result = await bulkEmailFromExcel(req.file.buffer, myInfo, options);

    res.status(200).json({
      message: "Bulk email generation successful",
      data: result
    });
  } catch (error) {
    console.error("Error in sendMessage:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}