import { Request, Response } from "express";
import EmailTemplateModel from "../../../../models/emailTemplate/emailTemplate.model";

export const createEmailTemplate = async (req: Request, res: Response) => {
  try {
    const instance = await new EmailTemplateModel(req.body).save();
    return res
      .status(201)
      .json({ message: "EmailTemplate created", data: instance });
  } catch (error) {
    console.error("createEmailTemplate error:", error);
    return res.status(500).json({ message: "Something went wrong", error });
  }
};

export const getAllEmailTemplates = async (req: Request, res: Response) => {
  try {
    const items = await EmailTemplateModel.find({});
    return res
      .status(200)
      .json({ message: "Fetched successfully", data: items });
  } catch (error) {
    console.error("getAllEmailTemplates error:", error);
    return res.status(500).json({ message: "Something went wrong", error });
  }
};

export const getEmailTemplateById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const item = await EmailTemplateModel.findById(id);
    if (!item) return res.status(404).json({ message: "Not found" });
    return res
      .status(200)
      .json({ message: "Fetched successfully", data: item });
  } catch (error) {
    console.error("getEmailTemplateById error:", error);
    return res.status(500).json({ message: "Something went wrong", error });
  }
};

export const updateEmailTemplate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updated = await EmailTemplateModel.findByIdAndUpdate(id, req.body, {
      new: true,
    });
    if (!updated) return res.status(404).json({ message: "Not found" });
    return res
      .status(200)
      .json({ message: "Updated successfully", data: updated });
  } catch (error) {
    console.error("updateEmailTemplate error:", error);
    return res.status(500).json({ message: "Something went wrong", error });
  }
};

export const deleteEmailTemplate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await EmailTemplateModel.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: "Not found" });
    return res.status(200).json({ message: "Deleted successfully" });
  } catch (error) {
    console.error("deleteEmailTemplate error:", error);
    return res.status(500).json({ message: "Something went wrong", error });
  }
};
