import { model } from "mongoose";
import { IAuthToken } from "../../types/interface/authToken.interface";
import { authTokenSchema } from "./authToken.schema";

const AuthTokenModel = model<IAuthToken>("auth_tokens", authTokenSchema);

export default AuthTokenModel;