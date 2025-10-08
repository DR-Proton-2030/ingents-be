import { Request, Response } from "express";
import PurchasedEmailTemplateModel from "../../../../models/purchasedEmailTemplate/purchasedEmailTemplate.model";

export const createPurchasedEmailTemplate = async (
  req: Request,
  res: Response
) => {
  try {
    const payload = req.body;
    const instance = await new PurchasedEmailTemplateModel(payload).save();
    return res
      .status(201)
      .json({ message: "PurchasedEmailTemplate created", data: instance });
  } catch (error) {
    console.error("createPurchasedEmailTemplate error:", error);
    return res.status(500).json({ message: "Something went wrong", error });
  }
};

export const getAllPurchasedEmailTemplates = async (
  req: Request,
  res: Response
) => {
  try {
    const filter: any = {};
    // If user is available, restrict to buyer_id
    if (req.user && req.user._id) filter.buyer_id = String(req.user._id);
    const items = await PurchasedEmailTemplateModel.find(filter);
    return res
      .status(200)
      .json({ message: "Fetched successfully", data: items });
  } catch (error) {
    console.error("getAllPurchasedEmailTemplates error:", error);
    return res.status(500).json({ message: "Something went wrong", error });
  }
};

export const getPurchasedEmailTemplateById = async (
  req: Request,
  res: Response
) => {
  try {
    const { id } = req.params;
    const item = await PurchasedEmailTemplateModel.findById(id);
    if (!item) return res.status(404).json({ message: "Not found" });
    return res
      .status(200)
      .json({ message: "Fetched successfully", data: item });
  } catch (error) {
    console.error("getPurchasedEmailTemplateById error:", error);
    return res.status(500).json({ message: "Something went wrong", error });
  }
};

export const updatePurchasedEmailTemplate = async (
  req: Request,
  res: Response
) => {
  try {
    const { id } = req.params;
    const updated = await PurchasedEmailTemplateModel.findByIdAndUpdate(
      id,
      req.body,
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: "Not found" });
    return res
      .status(200)
      .json({ message: "Updated successfully", data: updated });
  } catch (error) {
    console.error("updatePurchasedEmailTemplate error:", error);
    return res.status(500).json({ message: "Something went wrong", error });
  }
};

export const deletePurchasedEmailTemplate = async (
  req: Request,
  res: Response
) => {
  try {
    const { id } = req.params;
    const deleted = await PurchasedEmailTemplateModel.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: "Not found" });
    return res.status(200).json({ message: "Deleted successfully" });
  } catch (error) {
    console.error("deletePurchasedEmailTemplate error:", error);
    return res.status(500).json({ message: "Something went wrong", error });
  }
};
