import { model } from "mongoose";
import purchasedEmailTemplateSchema from "./purchasedEmailTemplate.schema";
import { IPurchasedEmailTemplate } from "../../types/interface/purchasedEmailTemplate.interface";

const PurchasedEmailTemplateModel = model<IPurchasedEmailTemplate>(
  "purchased_email_templates",
  purchasedEmailTemplateSchema
);

export default PurchasedEmailTemplateModel;
