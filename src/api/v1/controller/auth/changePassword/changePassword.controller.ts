import { Request, Response } from "express";
import generateToken from "../../../../../services/generateToken/generateToken.service";
import UserModel from "../../../../../models/users/users.model";
import { hashPassword } from "../../../../../services/passwordControl/hashPassword";
import { ItokenPayload } from "../../../../../types/interface/tokenPayload.interface";

export const changePassword = async (req: Request, res: Response) => {
	try {
		const { userId, newPassword } = req.body;
		const password = await hashPassword(newPassword);
		const user = await UserModel.findOneAndUpdate(
			{email:userId},
			{ $set: { password } },
			{ new: true }
		);

    const tokenPayload: ItokenPayload = {
      _id: String(user?._id || ""),
      company_object_id: user?.company_object_id
        ? user.company_object_id
        : null,
    };
    const token = generateToken(tokenPayload);

    return res.status(200).json({
      message: "Password changed successfully",
      result: { ...user?.toObject() },
      token,
    });
  } catch (error) {
    return res.status(400).json({
      message: "Failed to change password",
      error,
    });
  }
};
