import jwt, { SignOptions } from "jsonwebtoken";
import { jwtSecret } from "../../config/config";
import { ItokenPayload } from "../../types/interface/tokenPayload.interface";

const generateToken = (
  payload: ItokenPayload,
  expiresIn: SignOptions["expiresIn"] = "3h"
): string => {
  if (!jwtSecret) {
    throw new Error("JWT secret is not defined");
  }
  return jwt.sign(payload, jwtSecret, { expiresIn });
};

export default generateToken;
