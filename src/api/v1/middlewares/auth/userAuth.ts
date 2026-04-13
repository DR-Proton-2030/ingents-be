import { NextFunction, Request, Response } from "express";
import { verifyToken } from "../../../../services/verifyToken/verifyToken.service";
import UserModel from "../../../../models/users/users.model";

export const userAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const token =
    req.cookies?.token || req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const decoded = verifyToken(token);
    if (!decoded) {
      // Note: verifyToken already logs the specific error (expired vs invalid)
      res.status(401).json({ message: "Unauthorized: Invalid or expired token" });
      return;
    }

    if (!decoded.full_name && decoded._id) {
      const user = await UserModel.findById(decoded._id).select("full_name").lean();
      req.user = {
        ...decoded,
        full_name: user?.full_name || "Unknown",
      };
    } else {
      req.user = decoded;
    }

    next();
  } catch (error) {
    console.error("userAuth error:", error);
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};
