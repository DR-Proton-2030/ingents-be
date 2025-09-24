import { Request, Response } from "express";
import XLSX from "xlsx";
import { generateEmailBody } from "../../middlewares/helper/openai.helper";
import mongoose, { Types } from "mongoose";
import { columnMapping, getFieldValue } from "../../../../utils/excelHelpers";
import { saveCompany } from "../../../../utils/saveCompany";
import { saveGeneratedEmail } from "../../../../utils/saveGeneratedEmail";
import { saveChatHistory } from "../../../../utils/saveChatHistory";
import { MyCompanyInfo } from "../../../../types/interface/openai.interface";
import CompanyModel from "../../../../models/company/company.model";
import { MESSAGE } from "../../../../constants/message";
import axios from "axios";

export const handleUploadedFile = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();


    let workbook;

    if (req.file) {
      const mimetype = req.file.mimetype;

      if (
        mimetype ===
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
        mimetype === "application/vnd.ms-excel"
      ) {
        workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      } else if (mimetype === "text/csv") {
        const csvString = req.file.buffer.toString("utf-8");
        workbook = XLSX.read(csvString, { type: "string" });
      } else {
        return res
          .status(400)
          .json({ error: "Unsupported file type. Upload Excel or CSV." });
      }
    }
    else if (req.body.fileUrl) {
      const fileUrl = req.body.fileUrl;

      if (fileUrl.includes("docs.google.com/spreadsheets")) {
        // Export as CSV
        const sheetId = fileUrl.match(/\/d\/(.*?)\//)?.[1];
        if (!sheetId) {
          return res.status(400).json({ error: "Invalid Google Sheets URL" });
        }
        const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
        const response = await axios.get(exportUrl);
        workbook = XLSX.read(response.data, { type: "string" });
      }
      // 🟢 Handle direct Excel/CSV file links
      else {
        const response = await axios.get(fileUrl, {
          responseType: "arraybuffer",
        });
        workbook = XLSX.read(response.data, { type: "buffer" });
      }
    } else {
      return res.status(400).json({ error: MESSAGE.post.notUploaded });
    }


    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data: any[] = XLSX.utils.sheet_to_json(worksheet);

    const userId = new Types.ObjectId(req.user._id);
    const savedCompanies: any[] = [];

    const userCompany = await CompanyModel.findOne({
      _id: req.user.company_object_id,
    }).session(session);

    if (!userCompany) {
      await session.abortTransaction();
      return res.status(404).json({ error: MESSAGE.post.notFound });
    }

    for (const company of data) {
      const companyData = {
        company_name: getFieldValue(company, columnMapping.company_name),
        company_industry: getFieldValue(
          company,
          columnMapping.company_industry
        ),
        no_of_employees: getFieldValue(company, columnMapping.no_of_employees),
        type: getFieldValue(company, columnMapping.type),
        role: getFieldValue(company, columnMapping.role),
        company_email: getFieldValue(company, columnMapping.company_email),
        company_website:
          getFieldValue(company, columnMapping.company_website) || null,
        contact_number:
          getFieldValue(company, columnMapping.contact_number) || null,
      };

      const uploadedCompanyId = await saveCompany(userId, companyData, session);
      if (!uploadedCompanyId) continue;

      const myCompanyInfo: MyCompanyInfo = {
        my_company_name: userCompany.company_name,
        my_company_website: userCompany.website,
      };

      const generatedMail = await generateEmailBody(company, myCompanyInfo);
      if (!generatedMail) {
        return res.status(400).json({
          message: MESSAGE.post.error,
        });
      }
      const subject = generatedMail.subject;
      const body = generatedMail.body;
      const prompt = generatedMail.prompt;

      await saveGeneratedEmail(
        userId,
        uploadedCompanyId,
        subject,
        body,
        session
      );
      await saveChatHistory(userId, uploadedCompanyId, prompt, body, session);

      savedCompanies.push({
        company_name: companyData.company_name,
        email_sub: subject,
        email_body: body,
      });
    }

    await session.commitTransaction();

    return res.status(200).json({
      message: MESSAGE.post.succ,
      saved: savedCompanies,
    });
  } catch (err) {
    console.error("Excel parsing error:", err);
    await session.abortTransaction();
    return res.status(500).json({
      error: MESSAGE.post.fail,
    });
  } finally {
    session.endSession();
  }
};
