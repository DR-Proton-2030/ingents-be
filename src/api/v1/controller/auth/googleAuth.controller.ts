import { Request, Response } from "express";
import UserModel from "../../../../models/users/users.model";
import CompanyModel from "../../../../models/company/company.model";
import generateToken from "../../../../services/generateToken/generateToken.service";
import { ItokenPayload } from "../../../../types/interface/tokenPayload.interface";
import { google } from "googleapis";
import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, REDIRECT_URI } from "../../../../config/config";
import { SCOPES } from "../../../../services/googleAuth/GoogleAuth";
import AuthTokenModel from "../../../../models/authToken/authToken.model";

const oauth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  REDIRECT_URI,
);

export const googleSignUp = async (req: Request, res: Response) => {
  try {
    const { user_details } = req.body;

    const userExists = await UserModel.findOne({ email: user_details.email });
    if (userExists) {
      const companyInstance = await CompanyModel.findById(
        userExists.company_object_id,
      );

      const tokenPayload: ItokenPayload = {
        company_object_id: String(userExists.company_object_id),
        _id: String(userExists._id),
        role: "user",
        full_name: userExists.full_name,
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

export const googleAuth = async (req: Request, res: Response) => {
  try {
    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: SCOPES,
    });
    res.redirect(url);
  } catch (error) {
    console.error("Error during Google authentication:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

export const googleAuthCallback = async (req: Request, res: Response) => {
  try {
    const { code } = req.query;
    const {_id} = req.user;

    if (!code || typeof code !== "string") {
      return res
        .status(400)
        .json({ message: "Authorization code is required" });
    }

    const { tokens } = await oauth2Client.getToken(code);

    const { access_token, refresh_token, expiry_date } = tokens;

    const updatedAuthToken =await AuthTokenModel.findOneAndUpdate({ user_object_id: _id }, {
      $set:{
        google:{
            access_token,
            refresh_token,
            expiry_date: new Date(expiry_date || 0).getTime(),
        }
      }
    });
    
    if (!updatedAuthToken) {
      await AuthTokenModel.create({
        user_object_id: _id,
        google: {
          access_token,
          refresh_token,
          expiry_date: new Date(expiry_date || 0).getTime(),
        },
      });
    }

    oauth2Client.setCredentials(tokens);

    res.json({ message: "Google authentication successful", tokens });
  } catch (error) {
    console.error("Error during Google authentication callback:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};
