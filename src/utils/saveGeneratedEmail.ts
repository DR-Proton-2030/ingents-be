import { ClientSession, Types } from "mongoose";
import GeneratedEmailsModel from "../models/generatedEmails/generatedEmails.model";

export const saveGeneratedEmail = async (
  userId: Types.ObjectId,
  uploadedCompanyId: Types.ObjectId,
  subject: string,
  body: string,
  session: ClientSession
) => {
  return new GeneratedEmailsModel({
    userId,
    uploaded_company_id: uploadedCompanyId,
    email_sub: subject,
    email_body: body,
  }).save({ session });
};
