import { MyCompanyInfo } from "../../../types/interface/openai.interface";
import { bulkEmailFromExcel } from "./bulkEmailFromExcel.service";
import { Request } from "express";

export interface BulkEmailOptions {
  instructions?: string;
  scrapeWebsites?: boolean;
  maxConcurrentRequests?: number;
}

export interface BulkEmailProcessResult {
  response: object;
  status: number;
}

export async function processBulkEmailGenerationFromExcel(
  arg1: Buffer | Request,
  arg2?: MyCompanyInfo,
  arg3?: BulkEmailOptions
): Promise<{
  result: any;
  requiresInstructions: boolean;
}> {
  let buffer: Buffer;
  let companyInfo: MyCompanyInfo;
  let options: BulkEmailOptions;

  if (arg1 instanceof Buffer) {
    buffer = arg1;
    companyInfo = arg2!;
    options = arg3!;
  } else {
    const req = arg1 as Request;
    if (!req.file || !req.file.buffer) {
      throw new Error("Excel file is required");
    }
    buffer = req.file.buffer;
    companyInfo = {
      my_company_name: req.body.my_company_name,
      my_company_website: req.body.my_company_website
    };
    const instructions = (
      req.body.instructions ||
      req.body.email_instructions ||
      req.body.email_topic ||
      req.body.prompt ||
      req.body.goal ||
      ""
    ).toString();
    options = {
      instructions: instructions.trim() || undefined,
      scrapeWebsites: req.body.scrape_websites !== 'false',
      maxConcurrentRequests: parseInt(req.body.max_concurrent_requests) || 5
    };
  }
  const result = await bulkEmailFromExcel(buffer, companyInfo, options);
  const requiresInstructions = Boolean(result.requiresInstructions);
  return { result, requiresInstructions };
}
