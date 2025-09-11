import jwt from "jsonwebtoken";
import { jwtSecret } from "../../config/config";
import { ItokenPayload } from "../../types/interface/tokenPayload.interface";

export const verifyToken = (token: string): ItokenPayload | null => {
  try {
    if (!jwtSecret) {
      throw new Error("JWT secret is not defined");
    }
    const decoded = jwt.verify(token, jwtSecret) as ItokenPayload;
    return decoded;
  } catch (error) {
    console.error("Token verification failed:", error);
    return null;
  }
};
