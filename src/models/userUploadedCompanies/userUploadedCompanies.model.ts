import { model } from "mongoose";
import { IUserUploadedCompanies } from "../../types/interface/userUploadedCompanies.interface";
import { userUploadedCompanySchema } from "./userUploadedCompanies.schema";

const UploadedCompanyModel = model<IUserUploadedCompanies>("user_uploaded-companies", userUploadedCompanySchema);

export default UploadedCompanyModel;