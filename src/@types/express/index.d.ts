import { ITokenPayload } from "../../types/tokenPayload.interface";

declare module "express-serve-static-core" {
  interface Request {
    user?: ITokenPayload;
  }
}