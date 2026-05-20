import { Request, Response } from "express";
import { Types } from "mongoose";
import UserModel from "../../../../models/users/users.model";
import AttendanceModel from "../../../../models/attendance/attendance.model";
import { IUser } from "../../../../types/interface/user.interface";
import generateToken from "../../../../services/generateToken/generateToken.service";
import { ItokenPayload } from "../../../../types/interface/tokenPayload.interface";
import { hashPassword } from "../../../../services/passwordControl/hashPassword";

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
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Current month attendances
    const currentAttendances = await AttendanceModel.find({
      company_object_id,
      createdAt: { $gte: startOfCurrentMonth }
    });

    // Previous month attendances (for percentage calculation)
    const prevAttendances = await AttendanceModel.find({
      company_object_id,
      createdAt: { $gte: startOfPrevMonth, $lte: endOfPrevMonth }
    });

    // 5 Weeks x 7 Days grid
    const rawGridCounts = Array.from({ length: 5 }, () => Array(7).fill(0));

    currentAttendances.forEach(att => {
      const date = (att as any).createdAt as Date;
      if (!date) return;
      
      const dayOfMonth = date.getDate();
      const dayOfWeek = date.getDay(); // 0-6
      
      // Calculate week index (roughly)
      // We'll use: Math.floor((dayOfMonth - 1 + startOfCurrentMonth.getDay()) / 7)
      const firstDayOffset = startOfCurrentMonth.getDay();
      const weekIndex = Math.floor((dayOfMonth - 1 + firstDayOffset) / 7);

      if (weekIndex < 5) {
        rawGridCounts[weekIndex][dayOfWeek] += 1;
      }
    });

    const gridData: { count: number; intensity: number }[][] = [];

    for (let r = 0; r < 5; r++) {
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

    // Calculate percentage change
    const currentAvg = totalUsers > 0 ? currentAttendances.length / (totalUsers * now.getDate()) : 0;
    const prevAvg = totalUsers > 0 ? prevAttendances.length / (totalUsers * endOfPrevMonth.getDate()) : 0;
    
    let overallPercentage = 0;
    if (prevAvg > 0) {
      overallPercentage = Math.round(((currentAvg - prevAvg) / prevAvg) * 100);
    } else if (currentAvg > 0) {
      overallPercentage = 100;
    }

    return res.status(200).json({
      data: {
         gridData,
         overallPercentage
      }
    });
  } catch (error: any) {
    console.error("getAttendanceStats failed:", error);
    return res.status(500).json({ message: "Failed to fetch stats", error: error.message });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const { userId: bodyUserId, ...payload } = req.body;
    console.log("[updateUser] body keys:", Object.keys(req.body));
    console.log("[updateUser] memories received:", JSON.stringify(payload.memories));

    // Use userId from body if provided, otherwise fall back to the authenticated user's ID
    const userId = bodyUserId || req.user?._id;

    if (!userId) {
      return res.status(400).json({ message: "Missing userId" });
    }

    if (payload.password) {
      payload.password = await hashPassword(payload.password);
    }

    // Normalize memories — ensure it's always a proper string array
    // (FormData can serialize arrays as objects like { "0": "val" })
    if (payload.memories !== undefined) {
      if (Array.isArray(payload.memories)) {
        // Already an array — keep as-is
        payload.memories = payload.memories.map(String);
      } else if (typeof payload.memories === "object" && payload.memories !== null) {
        // Object with numeric keys e.g. { "0": "val", "1": "val2" } → convert to array
        payload.memories = Object.values(payload.memories).map(String);
      } else if (typeof payload.memories === "string") {
        // Single string — wrap in array
        payload.memories = [payload.memories];
      } else {
        payload.memories = [];
      }
    }

    // Fetch existing user to merge nested objects
    const existingUser = await UserModel.findById(userId);
    if (!existingUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Merge nested objects like facebook, instagram, etc.
    // Skip arrays (like memories) — they should be replaced, not merged
    for (const key of Object.keys(payload)) {
      if (
        !Array.isArray(payload[key]) &&          // ← skip arrays
        typeof payload[key] === "object" &&
        payload[key] !== null &&
        (existingUser as any)[key] &&
        typeof (existingUser as any)[key] === "object" &&
        !Array.isArray((existingUser as any)[key]) // ← skip if existing is also array
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

    console.log("[updateUser] Saved memories:", (updatedUser as any)?.memories);

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
    const { email, role, full_name, password } = req.body;
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
      company_object_id: new Types.ObjectId(company_object_id),
      ...(password ? { password: await hashPassword(password) } : {}),
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
