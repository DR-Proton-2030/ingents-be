import { Request, Response } from "express";
import UserModel from "../../../../models/users/users.model";
import AttendanceModel from "../../../../models/attendance/attendance.model";
import { IUser } from "../../../../types/interface/user.interface";
import generateToken from "../../../../services/generateToken/generateToken.service";
import { ItokenPayload } from "../../../../types/interface/tokenPayload.interface";
import { FRONTEND_URL } from "../../../../config/config";
import { callMailServer } from "../../../../services/callMailServer/callMailServer";

export const markAttendance = async (req: Request, res: Response) => {
  try {
    const user_id = req.user._id;
    const { company_object_id } = req.user;
    
    // Get current date string in YYYY-MM-DD
    const today = new Date().toISOString().split("T")[0];

    const existingAttendance = await AttendanceModel.findOne({
      user_object_id: user_id,
      date: today,
    });

    if (!existingAttendance) {
      await AttendanceModel.create({
        user_object_id: user_id,
        company_object_id,
        date: today,
      });
    }

    return res.status(200).json({
      message: "Attendance marked successfully",
    });
  } catch (error: any) {
    console.error("markAttendance failed:", error);
    return res
      .status(500)
      .json({ message: "Marking attendance failed", error: error.message });
  }
};

export const checkAttendance = async (req: Request, res: Response) => {
  try {
    const user_id = req.user._id;
    const today = new Date().toISOString().split("T")[0];

    const existingAttendance = await AttendanceModel.findOne({
      user_object_id: user_id,
      date: today,
    });

    return res.status(200).json({
      hasAttended: !!existingAttendance
    });
  } catch (error: any) {
    console.error("checkAttendance failed:", error);
    return res
      .status(500)
      .json({ message: "Checking attendance failed", error: error.message });
  }
};

export const getAttendanceStats = async (req: Request, res: Response) => {
  try {
    const { company_object_id } = req.user;

    const totalUsers = await UserModel.countDocuments({ company_object_id, has_joined: true });

    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Start on Sunday
    startOfWeek.setHours(0, 0, 0, 0);

    const attendances = await AttendanceModel.find({
      company_object_id,
      createdAt: { $gte: startOfWeek }
    });

    // rows: 0 (11:00), 1 (10:00), 2 (09:00), 3 (08:00)
    // cols: 0 (Sun) to 6 (Sat)
    const rawGridCounts = [
      [0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0],
    ];

    attendances.forEach(att => {
      const date = (att as any).createdAt as Date;
      if (!date) return;
      const day = date.getDay(); // 0-6
      const hour = date.getHours(); 

      let rowIndex = -1;
      if (hour >= 11 && hour < 12) rowIndex = 0;
      else if (hour >= 10 && hour < 11) rowIndex = 1;
      else if (hour >= 9 && hour < 10) rowIndex = 2;
      else if (hour >= 0 && hour < 9) rowIndex = 3; 
      else if (hour >= 12) rowIndex = 0; 

      if (rowIndex !== -1) {
        rawGridCounts[rowIndex][day] += 1;
      }
    });

    const gridData: { count: number; intensity: number }[][] = [];

    for (let r = 0; r < 4; r++) {
      const rowArr = [];
      for (let c = 0; c < 7; c++) {
        const count = rawGridCounts[r][c];
        let intensity = 0;
        
        if (totalUsers > 0 && count > 0) {
           const percent = count / totalUsers;
           if (percent <= 0.25) intensity = 1;
           else if (percent <= 0.50) intensity = 2;
           else if (percent <= 0.75) intensity = 3;
           else intensity = 4;
        }
        rowArr.push({ count, intensity });
      }
      gridData.push(rowArr);
    }

    return res.status(200).json({
      data: {
         gridData,
         overallPercentage: 15 // Mock fixed % for last month comparison based on design
      }
    });
  } catch (error: any) {
    console.error("getAttendanceStats failed:", error);
    return res.status(500).json({ message: "Failed to fetch stats", error: error.message });
  }
};

import { hashPassword } from "../../../../services/passwordControl/hashPassword";

export const updateUser = async (req: Request, res: Response) => {
  try {
    const { userId, ...payload } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "Missing userId" });
    }

    if (payload.password) {
      payload.password = await hashPassword(payload.password);
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

    const tokenPayload : ItokenPayload = {
      _id: userInstance._id.toString(),
      role,
      company_object_id: company_object_id.toString(),
      full_name: userInstance.full_name,
    }

    const token = generateToken(tokenPayload);

    const resetUrl = `${FRONTEND_URL}/setup-password?token=${token}`;

    await callMailServer("invite-user", {
      email,
      user_name: full_name || "User",
      password_setup_url: resetUrl
    })

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

    const users = await UserModel.find({ company_object_id,has_joined: true });

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
