import { Request, Response } from "express";
import UserModel from "../../../../models/users/users.model";

export const connectWhatsapp = async (req: Request, res: Response) => {
  try {
    const { _id: user_object_id } = req.user;
    const { phone_number_id, access_token, waba_id } = req.body;

    if (!phone_number_id || !access_token) {
      return res.status(400).json({ message: "Missing required WhatsApp credentials" });
    }

    const updatedUser = await UserModel.findByIdAndUpdate(
      user_object_id,
      {
        $set: {
          whatsapp: {
            phone_number_id,
            access_token,
            waba_id: waba_id || null,
          },
        },
      },
      { new: true }
    );

    res.status(200).json({
      message: "WhatsApp connected successfully",
      data: {
        whatsapp: updatedUser?.whatsapp,
      },
    });
  } catch (error) {
    console.error("❌ Connect WhatsApp Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const disconnectWhatsapp = async (req: Request, res: Response) => {
  try {
    const { _id: user_object_id } = req.user;

    await UserModel.findByIdAndUpdate(
      user_object_id,
      {
        $unset: { whatsapp: 1 },
      },
      { new: true }
    );

    res.status(200).json({ message: "WhatsApp disconnected successfully" });
  } catch (error) {
    console.error("❌ Disconnect WhatsApp Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
