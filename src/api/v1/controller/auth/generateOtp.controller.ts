import { Request, Response } from "express";
import UserModel from "../../../../models/users/users.model";
import { callMailServer } from "../../../../services/callMailServer/callMailServer";


export const generateOtp = async (req: Request, res: Response) => {
	try {
		const { email, type } = req.body;

		const user = await UserModel.findOne({
			email: { $regex: `^${email}$`, $options: "i" },
		});

		const otp = Math.floor(1000 + Math.random() * 9000).toString();

		if (type === "password-change") {
			if (!user) {
				return res.status(404).json({
					message: "Email not found",
				});
			}
			await callMailServer("forgotten-password", {
				email,
				otpCode: otp,
				userName: user.full_name || "User",
				resetUrl: "test.com"
			})
		} else {
			if (user) {
				return res.status(409).json({
					message: "Email already exists",
				});
			}
			await callMailServer("signup-otp", {
				email,
				otpCode: otp,
			})

		}


		// Email sending skipped for now

		return res.status(200).json({
			message: "OTP generated successfully",
			result: otp,
			userId: user?._id || null,
		});
	} catch (error) {
		console.error("Error in sendOtp:", error);
		return res.status(400).json({
			message: "Failed to generate OTP",
		});
	}
};



