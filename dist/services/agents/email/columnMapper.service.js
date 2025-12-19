"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapExcelColumns = void 0;
const openai_adapter_1 = require("../../../adapter/llm/openai.adapter");
const llmSystemRole_1 = require("../../../constants/llmRole/llmSystemRole");
const mapExcelColumns = (columnHeaders) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const prompt = `
Please map these Excel column headers to company data fields:

Column Headers: ${JSON.stringify(columnHeaders)}

Analyze each column and determine the best match for the following structure:
- companyName: variations like "Company Name", "COMPANY'S NAME", "Business Name"
- website: variations like "Website", "URL", "Company Website"
- email: variations like "Email", "Email Address", "Contact Email"
- industry: variations like "Industry", "Sector", "Business Type"
- type: variations like "Type", "Company Type", "Category"
- employees: variations like "No. of employees", "Employee Count", "Team Size"
- establishedYear: variations like "Established", "Founded", "Year Started"
- contactInfo: variations like "Contact", "Phone", "Address"
- details: variations like "Details", "Description", "About", "Notes"

If a column is not present, leave that field blank.
`;
        const response = yield (0, openai_adapter_1.generateOpenAiResponse)(prompt, llmSystemRole_1.llmSystemRole.columnMapping);
        if (!(response === null || response === void 0 ? void 0 : response.parsedContent)) {
            throw new Error("Failed to get column mapping from OpenAI");
        }
        const result = response.parsedContent;
        // Validate the response structure
        if (!result.mapping || typeof result.confidence !== "number") {
            throw new Error("Invalid mapping response structure");
        }
        // Ensure every expected field exists to avoid undefined checks downstream
        result.mapping = {
            companyName: result.mapping.companyName || "",
            website: result.mapping.website || "",
            email: result.mapping.email || "",
            industry: result.mapping.industry || "",
            type: result.mapping.type || "",
            employees: result.mapping.employees || "",
            establishedYear: result.mapping.establishedYear || "",
            contactInfo: result.mapping.contactInfo || "",
            details: result.mapping.details || "",
            name: result.mapping.name || "",
            firstName: result.mapping.firstName || "",
            lastName: result.mapping.lastName || "",
            customerSegment: result.mapping.customerSegment || "",
            preferences: result.mapping.preferences || "",
        };
        return result;
    }
    catch (error) {
        console.error("Error mapping Excel columns:", error);
        // Fallback: basic string matching
        return createFallbackMapping(columnHeaders);
    }
});
exports.mapExcelColumns = mapExcelColumns;
const createFallbackMapping = (columnHeaders) => {
    const mapping = {
        companyName: "",
        website: "",
        email: "",
        industry: "",
        type: "",
        employees: "",
        establishedYear: "",
        contactInfo: "",
        details: "",
        name: "",
        firstName: "",
        lastName: "",
        customerSegment: "",
        preferences: "",
    };
    // Normalize headers by trimming whitespace
    const normalizedHeaders = columnHeaders.map((h) => h.trim());
    const patterns = {
        companyName: /^(company.?s?.?name|name|business.?name|company)$/i,
        website: /^(website|url|web|company.?s?.?website)$/i,
        email: /^(email|e.?mail|contact.?email)$/i,
        industry: /^(industry|sector|business.?type)$/i,
        type: /^(type|category|company.?type)$/i,
        employees: /^(employees|staff|no.?of.?employees|employee.?count)$/i,
        establishedYear: /^(established|founded|year|established.?year)$/i,
        contactInfo: /^(contact|phone|address|contact.?info)$/i,
        details: /^(details|description|about|company.?details|notes)$/i,
    };
    Object.entries(patterns).forEach(([field, pattern]) => {
        if (!pattern)
            return;
        const matchingHeader = normalizedHeaders.find((header) => pattern.test(header));
        if (matchingHeader) {
            mapping[field] = matchingHeader;
        }
    });
    const mappedColumns = Object.values(mapping).filter((value) => value !== "");
    const unmappedColumns = normalizedHeaders.filter((header) => !mappedColumns.includes(header));
    return {
        mapping,
        confidence: 0.7,
        unmappedColumns,
    };
};
