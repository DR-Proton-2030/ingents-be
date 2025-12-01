import { Request, Response } from "express";
import mongoose from "mongoose";
import CompanyModel from "../../../../models/company/company.model";
import UserModel from "../../../../models/users/users.model";
import generateToken from "../../../../services/generateToken/generateToken.service";
import { IUser } from "../../../../types/interface/user.interface";
import { ItokenPayload } from "../../../../types/interface/tokenPayload.interface";
import { ICompany } from "../../../../types/interface/company.interface";
import { hashPassword } from "../../../../services/passwordControl/hashPassword";
import { comparePassword } from "../../../../services/passwordControl/comparePassword";
import { NODE_ENV } from "../../../../config/config";
import { callMailServer } from "../../../../services/callMailServer/callMailServer";
import { CompanyEmbeddingsService } from "../../../../services/companyEmbeddings/companyEmbeddings.service";

export const signUp = async (req: Request, res: Response) => {
  console.log("=========> Req Body:", req.body);
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const user_details =
      typeof req.body.user_details === "string"
        ? JSON.parse(req.body.user_details)
        : req.body.user_details;

    const company_details =
      typeof req.body.company_details === "string"
        ? JSON.parse(req.body.company_details)
        : req.body.company_details;

    const { user_avatar, company_logo } = req.body;

    const userExists = await UserModel.findOne({
      email: user_details.email,
    }).session(session);

    if (userExists) {
      await session.abortTransaction();
      session.endSession();
      return res.status(409).json({ message: "User already exists" });
    }
    
    console.log("===>Logo", company_logo);
    const companyPayload: ICompany = {
      ...company_details,
      logo: company_logo || null,
    };
    const companyInstance = await new CompanyModel(companyPayload).save({
      session,
    });
    const userPayload: IUser = {
      ...user_details,
      password: await hashPassword(user_details.password),
      company_object_id: companyInstance._id,
      profile_picture: user_avatar || null,
    };
    const userInstance = await new UserModel(userPayload).save({ session });

    // Generate company embeddings for RAG functionality
    try {
      console.log('Generating company embeddings...');
      await CompanyEmbeddingsService.createCompanyEmbeddings(
        {
          company: companyInstance.toObject(),
          additionalContext: [
            `Primary contact: ${user_details.full_name} (${user_details.email})`,
            `User role: ${user_details.role || 'Administrator'}`,
            `Registration date: ${new Date().toISOString()}`
          ]
        },
        session
      );
      console.log('Company embeddings generated successfully');
    } catch (embeddingError) {
      console.error('Error generating company embeddings:', embeddingError);
      // Don't fail the signup if embeddings fail, but log the error
      // You might want to implement a retry mechanism or background job here
    }

    await session.commitTransaction();
    session.endSession();

    // await callMailServer("welcome", {
    //   email: user_details.email,
    //   userName: user_details.full_name || "There",
    // });
    const tokenPayload: ItokenPayload = {
      company_object_id: String(companyInstance._id),
      _id: String(userInstance._id),
      role: "user",
    };
    const token: string = generateToken(tokenPayload);

    res.cookie("token", token, {
      httpOnly: true, // Prevents JavaScript access (XSS protection)
      secure: NODE_ENV === "production", // Use secure cookies in production
      sameSite: NODE_ENV === "production" ? "none" : "lax",
      path: "/", // Makes cookie accessible across the entire app
      maxAge: 3 * 60 * 60 * 1000, // 3 hours expiration
      domain: NODE_ENV === "production" ? ".ingents.ai" : "localhost", // Set domain for production
    });

    const userDetails = {
      ...userInstance.toObject(),
      company_details: companyInstance.toObject(),
    };

    return res.status(200).json({
      message: "User created successfully",
      data: { user: userDetails, token },
    });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();
    return res.status(500).json({ message: "Something went wrong", error });
  }
};

export const signIn = async (req: Request, res: Response) => {
  console.log("==========> Req Body:", req.body);
  try {
    const { email, password } = req.body;
    const user: any = await UserModel.findOne({ email }).populate(
      "company_details"
    );
    if (!user) {
      console.log("User not found");
      return res.status(404).json({ message: "User not found" });
    }
    const isMatchPassword = await comparePassword(password, user.password);
    if (!isMatchPassword) {
      return res.status(401).json({ message: "Wrong password" });
    }
    const tokenPayload: ItokenPayload = {
      company_object_id: String(user.company_object_id),
      _id: String(user._id),
      role: "user",
    };
    const token: string = generateToken(tokenPayload);
    delete user.password; // Remove password from response

    res.cookie("token", token, {
      httpOnly: true, // Prevents JavaScript access (XSS protection)
      secure: NODE_ENV === "production", // Use secure cookies in production
      sameSite: NODE_ENV === "production" ? "none" : "lax",
      path: "/", // Makes cookie accessible across the entire app
      maxAge: 3 * 60 * 60 * 1000, // 3 hours expiration
      domain: NODE_ENV === "production" ? ".ingents.ai" : "localhost", // Set domain for production
    });
    console.log("====> User logged in:", user);
    return res.status(200).json({
      message: "User logged in successfully",
      data: {
        user,
        token,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Something went wrong", error });
  }
};

export const verifyToken = async (req: Request, res: Response) => {
  try {
    const { _id, company_object_id } = req.user;
    console.log("user", _id, company_object_id);
    const user = await UserModel.findById(_id).populate("company_details");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.status(200).json({
      message: "Token verified successfully",
      data: {
        user,
      },
    });
  } catch (error) {
    return res.status(400).json({ message: "Something went wrong", error });
  }
};

export const createUser = async (req: Request, res: Response) => {
  try {
    const { user_details, profile_picture } = req.body;
    const { company_object_id } = req.user;

    if (!company_object_id) {
      return res.status(400).json({ message: "Company ID is required" });
    }

    let user: Partial<IUser>;
    try {
      user = JSON.parse(user_details);
    } catch (err) {
      return res.status(400).json({ message: "Invalid user_details format" });
    }

    if (!user.password)
      return res.status(400).json({ message: "Password is required" });

    const existingUser = await UserModel.findOne({ email: user.email });
    if (existingUser)
      return res.status(400).json({
        message: "User with this email already exists under this client",
      });

    const hashedPassword = await hashPassword(user.password);

    const userPayload: Partial<IUser> = {
      ...user,
      password: hashedPassword,
      company_object_id,
      profile_picture,
    };

    const userInstance = await new UserModel(userPayload).save();

    return res.status(200).json({
      message: "Client user created successfully",
      data: userInstance,
    });
  } catch (error) {
    console.log("====> createClientUser error:", error);
    return res.status(500).json({ message: "Something went wrong", error });
  }
};

export const getUsers = async (req: Request, res: Response) => {
  try {
    const { company_object_id } = req.user;

    if (!company_object_id) {
      return res.status(400).json({ message: "Company ID not found in user" });
    }

    const users = await UserModel.find({ company_object_id });

    return res.status(200).json({
      message: "Users fetched successfully",
      data: users,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return res.status(500).json({ message: "Something went wrong", error });
  }
};
export const getUsersByClientId = async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;

    if (!clientId) {
      return res.status(400).json({ message: "Client ID is required" });
    }

    const users = await UserModel.find({ client_object_id: clientId });

    return res.status(200).json({
      message: "Users fetched successfully",
      data: users,
    });
  } catch (error) {
    console.error("Error fetching users by clientId:", error);
    return res.status(500).json({ message: "Something went wrong", error });
  }
};

export const logoutUser = async (req: Request, res: Response) => {
  try {
    res.clearCookie("token", {
      httpOnly: true, // Prevents JavaScript access (XSS protection)
      secure: NODE_ENV === "production", // Use secure cookies in production
      sameSite: NODE_ENV === "production" ? "none" : "lax",
      path: "/", // Makes cookie accessible across the entire app
      domain: NODE_ENV === "production" ? ".bidready.com" : "localhost",
    });
    res.status(200).json({
      message: "User logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
};
