import { model } from "mongoose";
import { ICompanySettings } from "../../types/interface/companySettings.interface";
import companySettingsSchema from "./CompanySettings.schema";

const CompanySettingsModel = model<ICompanySettings>(
  "company_settings",
  companySettingsSchema
);

export default CompanySettingsModel;
