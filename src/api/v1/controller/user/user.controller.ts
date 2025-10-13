import { Request, Response } from "express";
import UserModel from "../../../../models/users/users.model";

export const updateUser = async (req: Request, res: Response) => {
  try {
    const { userId, ...payload } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "Missing userId" });
    }

    // Fetch existing user to merge nested objects
    const existingUser = await UserModel.findById(userId);
    if (!existingUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Merge nested objects like facebook, instagram, etc.
    for (const key of Object.keys(payload)) {
      if (
        typeof payload[key] === "object" &&
        payload[key] !== null &&
        (existingUser as any)[key] &&
        typeof (existingUser as any)[key] === "object"
      ) {
        const existingVal = (existingUser as any)[key];
        payload[key] = {
          ...(existingVal && existingVal.toObject
            ? existingVal.toObject()
            : existingVal),
          ...payload[key],
        };
      }
    }

    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      { $set: payload },
      { new: true }
    );

    return res.status(200).json({
      message: "User updated successfully",
      result: updatedUser,
    });
  } catch (error: any) {
    console.error("Update failed:", error);
    return res
      .status(500)
      .json({ message: "User update failed", error: error.message });
  }
};
