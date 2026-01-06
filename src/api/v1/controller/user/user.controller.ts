import { Request, Response } from "express";
import UserModel from "../../../../models/users/users.model";
import { IUser } from "../../../../types/interface/user.interface";

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

export const createUser = async (req: Request, res: Response) => {
  try {
    const { email, role, full_name } = req.body;
    const { company_object_id } = req.user;

    if (!company_object_id) {
      return res.status(400).json({ message: "Company ID is required" });
    }

    const existingUser = await UserModel.findOne({ email: email });
    if (existingUser)
      return res.status(400).json({
        message: "User with this email already exists",
      });

    const userPayload: Partial<IUser> = {
      email,
      role,
      full_name,
      has_joined: false,
      company_object_id,
    }

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




export const getUserById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // get user ID from URL

    if (!id) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const user = await UserModel.findById(id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      message: "User fetched successfully",
      data: user,
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return res.status(500).json({ message: "Something went wrong", error });
  }
};

export const searchUsers = async (req: Request, res: Response) => {
  try {
    const { query = "" } = req.query;
    const { company_object_id } = req.user;

    const safeQuery =
      typeof query === "string"
        ? query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
        : "";

    const filter: any = {
      company_object_id,
    };

    if (safeQuery) {
      filter.$or = [
        { full_name: { $regex: `^${safeQuery}`, $options: "i" } },
        { email: { $regex: `^${safeQuery}`, $options: "i" } },
      ];
    }

    const users = await UserModel.find(filter)
      .select("_id full_name email role")
      .limit(20)
      .lean();

    return res.status(200).json({ data: users });
  } catch (error) {
    console.error("Search users error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
