import { model } from "mongoose";
import { generatedEmailsSchema } from "./generatedEmails.schema";
import { IGeneratedEmails } from "../../types/interface/generatedEmails.interface";

const GeneratedEmailsModel = model<IGeneratedEmails>("generated_emails", generatedEmailsSchema);

export default GeneratedEmailsModel;