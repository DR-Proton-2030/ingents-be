
import { Types, ClientSession } from "mongoose";
import UploadedCompanyModel from "../models/userUploadedCompanies/userUploadedCompanies.model";

export const saveCompany = async (
  userId: Types.ObjectId,
  companyData: any,
  session: ClientSession
): Promise<Types.ObjectId | null> => {
  // const userDoc = await UploadedCompanyModel.findOne({ userId }).session(session);

  // if (userDoc) {
  //   const exists = userDoc.companies.find(
  //     (c) => c.company_name === companyData.company_name
  //   );
  //   if (exists) return null; // already exists, skip

  //   userDoc.companies.push(companyData);
  //   const updatedDoc = await userDoc.save({ session });
  //   return new Types.ObjectId(
  //     updatedDoc.companies[updatedDoc.companies.length - 1]._id
  //   );
  // } else {
  //   const newUserDoc = await new UploadedCompanyModel({
  //     userId,
  //     companies: [companyData],
  //   }).save({ session });

  //   return new Types.ObjectId(newUserDoc.companies[0]._id);
  // }

  console.log(companyData)

  const newUserDoc = await new UploadedCompanyModel({
      userId,
      ...companyData,
    }).save({ session });

    return new Types.ObjectId(newUserDoc._id);
};
