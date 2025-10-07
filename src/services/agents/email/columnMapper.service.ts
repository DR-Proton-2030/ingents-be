import { generateOpenAiResponse } from "../../../adapter/llm/openai.adapter";
import {
  FieldMapping,
  MappingResult,
} from "../../../types/interface/bulkEmail.interface";
import { llmSystemRole } from "../../../constants/llmRole/llmSystemRole";

export const mapExcelColumns = async (
  columnHeaders: string[]
): Promise<MappingResult> => {
  try {
    const prompt = `
Please map these Excel column headers to company data fields:

Column Headers: ${JSON.stringify(columnHeaders)}

Analyze each column and determine the best mapping based on the column name meaning.
Be flexible with variations like:
- "Company Name", "COMPANY'S NAME", "Name", "Business Name"
- "Website", "URL", "Company Website", "Web"
- "Email", "Email Address", "Contact Email"
- "Industry", "Sector", "Business Type"
- etc.
`;

    const response = await generateOpenAiResponse(
      prompt,
      llmSystemRole.columnMapping
    );

    if (!response?.parsedContent) {
      throw new Error("Failed to get column mapping from OpenAI");
    }

    const result = response.parsedContent as MappingResult;

    // Validate the response structure
    if (!result.mapping || typeof result.confidence !== "number") {
      throw new Error("Invalid mapping response structure");
    }

    return result;
  } catch (error) {
    console.error("Error mapping Excel columns:", error);

    // Fallback: basic string matching
    return createFallbackMapping(columnHeaders);
  }
};

const createFallbackMapping = (columnHeaders: string[]): MappingResult => {
  const mapping: FieldMapping = {
    companyName: "",
    website: "",
    email: "",
    industry: "",
    type: "",
    employees: "",
    establishedYear: "",
    contactInfo: "",
    details: "",
  };

  const lowerHeaders = columnHeaders.map((h) => h.toLowerCase());

  // Basic pattern matching
  const patterns = {
    companyName: /^(company.?name|name|business.?name|company)$/i,
    website: /^(website|url|web|company.?website)$/i,
    email: /^(email|e.?mail|contact.?email)$/i,
    industry: /^(industry|sector|business.?type)$/i,
    type: /^(type|category|company.?type)$/i,
    employees: /^(employees|staff|no.?of.?employees|employee.?count)$/i,
    establishedYear: /^(established|founded|year|established.?year)$/i,
    contactInfo: /^(contact|phone|address|contact.?info)$/i,
    details: /^(details|description|about|company.?details)$/i,
  };

  for (const [field, pattern] of Object.entries(patterns)) {
    const matchingHeader = columnHeaders.find((header) => pattern.test(header));
    if (matchingHeader) {
      (mapping as any)[field] = matchingHeader;
    }
  }

  const mappedColumns = Object.values(mapping).filter((v) => v !== "");
  const unmappedColumns = columnHeaders.filter(
    (h) => !mappedColumns.includes(h)
  );

  return {
    mapping,
    confidence: 0.7, // Lower confidence for fallback
    unmappedColumns,
  };
};
