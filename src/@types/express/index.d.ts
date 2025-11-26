import { ItokenPayload } from "../../types/interface/tokenPayload.interface";
declare module "express-serve-static-core" {
  interface Request {
    user: ItokenPayload;
  }
}