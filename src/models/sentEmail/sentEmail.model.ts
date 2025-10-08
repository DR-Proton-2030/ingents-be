import { model } from "mongoose";
import sentEmailSchema from "./sentEmail.schema";
import { ISentEmail } from "../../types/interface/sentEmail.interface";

const SentEmailModel = model<ISentEmail>("sent_emails", sentEmailSchema);

export default SentEmailModel;
