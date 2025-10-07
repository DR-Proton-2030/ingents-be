import { Request, Response } from "express";
import { bulkEmailFromExcel } from "../../../../services/agents/email/bulkEmailFromExcel.service";

export const sendMessage = async (req: Request, res: Response) => {
  try {
    // Extract excel file from req.file
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ message: "Excel file is required" });
    }

    // Import bulkEmailFromExcel dynamically to avoid circular deps
    // Prepare company info (can be extended as needed)
    const myInfo = {
      my_company_name: req.body.my_company_name || req.user?.company_details?.company_name || "",
      my_company_website: req.body.my_company_website || req.user?.company_details?.company_website || ""
    };

    // Call bulkEmailFromExcel
    const result = await bulkEmailFromExcel(req.file.buffer, myInfo);

    res.status(200).json({
      message: "Bulk email generation successful",
      data: result
    });
  } catch (error) {
    console.error("Error in sendMessage:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}