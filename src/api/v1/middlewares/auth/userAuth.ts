import { NextFunction, Request, Response } from "express";
import { verifyToken } from "../../../../services/verifyToken/verifyToken.service";

export const userAuth = (req: Request, res: Response, next: NextFunction) => {
  const token =
    req.cookies?.token || req.header("Authorization")?.replace("Bearer ", "");
  console.log("token", token);
  console.log("token", token);
  if (!token) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  try {
    const decoded = verifyToken(token);
    if (!decoded) {
      res.status(403).json({ message: "Invalid token" });
      return;
    }
    req.user = decoded; // Attach user data to request
    next();
  } catch (error) {
    res.status(403).json({ message: "Invalid token" });
    return;
  }
};
