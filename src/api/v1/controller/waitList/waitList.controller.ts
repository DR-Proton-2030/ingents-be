import { Request, Response } from "express";
import UserModel from "../../../../models/users/users.model";
import WaitListModel from "../../../../models/waitlist/waitList.model";

export const createWaitList = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const ip_address = req.clientIp || "unknown";
    console.log("client ip", ip_address);
    const newWaitlistEntry = await new WaitListModel({
      email,
      ip_address,
    }).save();

    return res
      .status(201)
      .json({
        message: "Waitlist entry created successfully",
        data: newWaitlistEntry,
      });
  } catch (error: any) {
    console.error("Waitlist creation failed:", error);
    return res
      .status(500)
      .json({ message: "Waitlist creation failed", error: error.message });
  }
};
