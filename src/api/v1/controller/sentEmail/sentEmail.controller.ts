import { Request, Response } from "express";
import SentEmailModel from "../../../../models/sentEmail/sentEmail.model";

export const createSentEmail = async (req: Request, res: Response) => {
  try {
    const instance = await new SentEmailModel(req.body).save();
    return res
      .status(201)
      .json({ message: "SentEmail created", data: instance });
  } catch (error) {
    console.error("createSentEmail error:", error);
    return res.status(500).json({ message: "Something went wrong", error });
  }
};

export const getAllSentEmails = async (req: Request, res: Response) => {
  try {
    const filter: any = {};
    if (req.user && req.user.company_object_id)
      filter.company_id = String(req.user.company_object_id);
    const items = await SentEmailModel.find(filter);
    return res
      .status(200)
      .json({ message: "Fetched successfully", data: items });
  } catch (error) {
    console.error("getAllSentEmails error:", error);
    return res.status(500).json({ message: "Something went wrong", error });
  }
};

export const getSentEmailById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const item = await SentEmailModel.findById(id);
    if (!item) return res.status(404).json({ message: "Not found" });
    return res
      .status(200)
      .json({ message: "Fetched successfully", data: item });
  } catch (error) {
    console.error("getSentEmailById error:", error);
    return res.status(500).json({ message: "Something went wrong", error });
  }
};

export const updateSentEmail = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updated = await SentEmailModel.findByIdAndUpdate(id, req.body, {
      new: true,
    });
    if (!updated) return res.status(404).json({ message: "Not found" });
    return res
      .status(200)
      .json({ message: "Updated successfully", data: updated });
  } catch (error) {
    console.error("updateSentEmail error:", error);
    return res.status(500).json({ message: "Something went wrong", error });
  }
};

export const deleteSentEmail = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await SentEmailModel.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: "Not found" });
    return res.status(200).json({ message: "Deleted successfully" });
  } catch (error) {
    console.error("deleteSentEmail error:", error);
    return res.status(500).json({ message: "Something went wrong", error });
  }
};
