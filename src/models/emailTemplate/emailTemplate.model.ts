import { model } from "mongoose";
import emailTemplateSchema from "./emailTemplate.schema";
import { IEmailTemplate } from "../../types/interface/emailTemplate.interface";

const EmailTemplateModel = model<IEmailTemplate>(
  "email_templates",
  emailTemplateSchema
);

export default EmailTemplateModel;
