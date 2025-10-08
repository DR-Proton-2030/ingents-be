import { emailPrompt } from "../../../constants/prompts/emailPrompt";
import { llmSystemRole } from "../../../constants/llmRole/llmSystemRole";
import { generateOpenAiResponse } from "../../../adapter/llm/openai.adapter";
import { CompanyDetails, MyCompanyInfo } from "../../../types/interface/openai.interface";
import { convertExcelToJson, getExcelColumns } from "./excelToJson.service";
import { mapExcelColumns } from "./columnMapper.service";
import { scrapeCompanyWebsite, formatScrapedDataAsDetails } from "./websiteScraper.service";
import { FieldMapping, BulkEmailResult, ProcessingOptions } from "../../../types/interface/bulkEmail.interface";

export const bulkEmailFromExcel = async (
  excelBuffer: Buffer,
  myInfo: MyCompanyInfo,
  options: ProcessingOptions = {}
): Promise<{
  results: BulkEmailResult[];
  columnMapping: FieldMapping;
  unmappedColumns: string[];
  totalProcessed: number;
  errors: string[];
}> => {
  const {
    scrapeWebsites = true,
    maxConcurrentRequests = 5
  } = options;

  const errors: string[] = [];

  try {
    // Step 1: Extract columns and create intelligent mapping
    const columnHeaders = getExcelColumns(excelBuffer);
    console.log("Detected columns:", columnHeaders);

    if (columnHeaders.length === 0) {
      throw new Error("No columns detected in Excel file");
    }

    // Step 2: Use OpenAI to map columns intelligently
    const mappingResult = await mapExcelColumns(columnHeaders);
    console.log("Column mapping result:", mappingResult);

    // Step 3: Convert Excel to JSON
    const jsonData = convertExcelToJson(excelBuffer);
    console.log(`Processing ${jsonData.length} companies`);

    // Step 4: Process companies in batches
    const results: BulkEmailResult[] = [];
    const batchSize = maxConcurrentRequests;

    for (let i = 0; i < jsonData.length; i += batchSize) {
      const batch = jsonData.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (row) => {
        return await processCompanyRow(
          row,
          mappingResult.mapping,
          myInfo,
          scrapeWebsites
        );
      });

      try {
        const batchResults = await Promise.allSettled(batchPromises);
        
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled' && result.value) {
            results.push(result.value);
          } else if (result.status === 'rejected') {
            const companyName = getValueFromRow(batch[index], mappingResult.mapping.companyName) || `Company ${i + index + 1}`;
            errors.push(`Failed to process ${companyName}: ${result.reason}`);
          }
        });
      } catch (batchError) {
        errors.push(`Batch processing error: ${batchError}`);
      }

      // Add a small delay between batches to avoid overwhelming APIs
      if (i + batchSize < jsonData.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return {
      results,
      columnMapping: mappingResult.mapping,
      unmappedColumns: mappingResult.unmappedColumns,
      totalProcessed: jsonData.length,
      errors
    };

  } catch (error) {
    console.error("Error in bulkEmailFromExcel:", error);
    throw error;
  }
};

const processCompanyRow = async (
  row: any,
  mapping: FieldMapping,
  myInfo: MyCompanyInfo,
  scrapeWebsite: boolean
): Promise<BulkEmailResult | null> => {
  try {
    // Extract company data using the intelligent mapping
    const companyName = getValueFromRow(row, mapping.companyName);
    const website = getValueFromRow(row, mapping.website);
    const email = getValueFromRow(row, mapping.email);
    const industry = getValueFromRow(row, mapping.industry);
    const employees = getValueFromRow(row, mapping.employees);
    const type = getValueFromRow(row, mapping.type);
    const contactInfo = getValueFromRow(row, mapping.contactInfo);
    const establishedYear = getValueFromRow(row, mapping.establishedYear);
    let details = getValueFromRow(row, mapping.details);

    if (!companyName) {
      throw new Error("Company name is required but not found");
    }

    // If details are missing and website is available, scrape the website
    if (!details && website && scrapeWebsite) {
      try {
        const scrapedData = await scrapeCompanyWebsite(website);
        details = formatScrapedDataAsDetails(scrapedData);
        
        // If industry wasn't in the Excel but found during scraping, use it
        if (!industry && scrapedData.industry) {
          // We can't modify the industry here as it's const, but we can note it
        }
      } catch (scrapeError) {
        console.warn(`Failed to scrape website for ${companyName}:`, scrapeError);
      }
    }

    // Prepare company details for email generation
    const companyDetails: CompanyDetails = {
      "COMPANY'S NAME": companyName,
      "INDUSTRY": industry || "",
      "TYPE": type || "",
      "Company's Website": website || "",
      "Email": email || "",
      "No. of employees": employees || "",
      "ESTABLISHED YEAR": establishedYear || "",
      "Contact info": contactInfo || ""
    };

    // Generate email using OpenAI
    const prompt = emailPrompt({ ...companyDetails, DETAILS: details } as any, myInfo);
    const aiResponse = await generateOpenAiResponse(prompt, llmSystemRole.emailWriter);
    
    if (!aiResponse?.parsedContent) {
      throw new Error("Failed to generate email content");
    }

    const { subject, body } = aiResponse.parsedContent;

    return {
      company: companyName,
      website: website || "",
      email: email || "",
      details: details || "",
      subject: subject || "",
      body: body || "",
      industry: industry || "",
      employees: employees || "",
      type: type || ""
    };

  } catch (error) {
    console.error(`Error processing company row:`, error);
    throw error;
  }
};

const getValueFromRow = (row: any, columnName: string): string => {
  if (!columnName || !row) return "";
  
  // Try exact match first
  if (row[columnName] !== undefined) {
    return String(row[columnName]).trim();
  }
  
  // Try case-insensitive match
  const keys = Object.keys(row);
  const matchingKey = keys.find(key => 
    key.toLowerCase() === columnName.toLowerCase()
  );
  
  if (matchingKey && row[matchingKey] !== undefined) {
    return String(row[matchingKey]).trim();
  }
  
  return "";
};
