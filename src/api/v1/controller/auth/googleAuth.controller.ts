import { Request, Response } from "express";
import UserModel from "../../../../models/users/users.model";
import CompanyModel from "../../../../models/company/company.model";
import generateToken from "../../../../services/generateToken/generateToken.service";
import { ItokenPayload } from "../../../../types/interface/tokenPayload.interface";

export const googleSignUp = async (req: Request, res: Response) => {
  try {
    const { user_details } = req.body;

    const userExists = await UserModel.findOne({ email: user_details.email });
    if (userExists) {
      const companyInstance = await CompanyModel.findById(
        userExists.company_object_id
      );

      const tokenPayload: ItokenPayload = {
        company_object_id: String(userExists.company_object_id),
        _id: String(userExists._id),
        role: "user",
      };

      const token: string = generateToken(tokenPayload);

      return res.status(200).json({
        message: "User authenticated successfully",
        data: {
          user: userExists,
          company: companyInstance,
          token: token,
        },
      });
    }

    return res.status(200).json({
      message:
        "User google login and redirect company details page successfully",
    });
  } catch (error) {
    console.error("Error during Google sign-up:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};
