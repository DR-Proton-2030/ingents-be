import { Request, Response } from "express";
import UserModel from "../../../../models/users/users.model";
import generateToken from "../../../../services/generateToken/generateToken.service";
import { ItokenPayload } from "../../../../types/interface/tokenPayload.interface";
import { google } from "googleapis";
import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, NODE_ENV, REDIRECT_URI } from "../../../../config/config";
import { SCOPES } from "../../../../services/googleAuth/GoogleAuth";
import AuthTokenModel from "../../../../models/authToken/authToken.model";

const oauth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  REDIRECT_URI,
);

export const googleSignUp = async (req: Request, res: Response) => {
  try {
    const { email, full_name, profile_picture, google_id } = req.body;

    console.log("[googleSignUp] Request body:", { email, full_name, google_id });
    console.log("[googleSignUp] MongoDB host:", require("mongoose").connection.host || "not connected");

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    // --- Guard: JWT_SECRET must be set ---
    if (!process.env.JWT_SECRET) {
      console.error("[googleSignUp] FATAL: JWT_SECRET env variable is not set");
      return res.status(500).json({
        success: false,
        message: "Server misconfiguration: JWT_SECRET is not set",
      });
    }

    // --- Find user by email (case-insensitive) ---
    let user: any;
    try {
      user = await UserModel.findOne({
        email: { $regex: new RegExp(`^${email.trim()}$`, "i") },
      }).populate("company_details");
      console.log(
        "[googleSignUp] DB lookup for email:",
        email.trim(),
        "→",
        user ? `Found user _id=${user._id} email=${user.email}` : "NOT FOUND in DB"
      );
    } catch (dbError: any) {
      console.error("[googleSignUp] DB error during findOne:", dbError.message, dbError.stack);
      return res.status(500).json({
        success: false,
        message: "Database error while looking up user",
      });
    }

    // --- User NOT found → redirect to signup ---
    if (!user) {
      return res.status(404).json({
        success: false,
        code: "USER_NOT_FOUND",
        message: "User not found, please complete signup",
        data: {
          user: {
            email,
            full_name: full_name || "",
            profile_picture: profile_picture || "",
            google_id: google_id || "",
          },
        },
      });
    }

    // --- User EXISTS → generate JWT ---
    let token: string;
    try {
      const tokenPayload: ItokenPayload = {
        company_object_id: String(user.company_object_id),
        _id: String(user._id),
        role: user.role || "user",
        full_name: user.full_name,
      };
      token = generateToken(tokenPayload);
      console.log("[googleSignUp] Token generated successfully for user:", user._id);
    } catch (tokenError: any) {
      console.error("[googleSignUp] Token generation failed:", tokenError.message, tokenError.stack);
      return res.status(500).json({
        success: false,
        message: "Failed to generate authentication token",
      });
    }

    // --- Sanitize user object ---
    const userObj = user.toObject();
    delete userObj.password;

    // --- Set httpOnly cookie (identical to regular signIn) ---
    res.cookie("token", token, {
      httpOnly: true,
      secure: NODE_ENV === "production",
      sameSite: NODE_ENV === "production" ? "none" : "strict",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      ...(NODE_ENV === "production" && { domain: ".ingents.ai" }),
    });

    console.log("[googleSignUp] Login success for:", email);

    return res.status(200).json({
      success: true,
      code: "LOGIN_SUCCESS",
      data: {
        user: userObj,
        token,
      },
    });
  } catch (error: any) {
    console.error("[googleSignUp] crashed:", error.stack || error.message);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
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
