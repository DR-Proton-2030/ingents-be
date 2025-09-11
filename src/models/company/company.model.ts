import { model } from "mongoose";
import companySchema from "./company.schema";
import { ICompany } from "../../types/interface/company.interface";

const CompanyModel = model<ICompany>("companies", companySchema);

export default CompanyModel;