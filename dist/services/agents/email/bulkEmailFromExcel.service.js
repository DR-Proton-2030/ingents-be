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
exports.bulkEmailFromExcel = void 0;
const emailPrompt_1 = require("../../../constants/prompts/emailPrompt");
const llmSystemRole_1 = require("../../../constants/llmRole/llmSystemRole");
const openai_adapter_1 = require("../../../adapter/llm/openai.adapter");
const excelToJson_service_1 = require("./excelToJson.service");
const columnMapper_service_1 = require("./columnMapper.service");
const websiteScraper_service_1 = require("./websiteScraper.service");
const bulkEmailFromExcel = (excelBuffer_1, myInfo_1, ...args_1) => __awaiter(void 0, [excelBuffer_1, myInfo_1, ...args_1], void 0, function* (excelBuffer, myInfo, options = {}) {
    const { scrapeWebsites = true, maxConcurrentRequests = 5, instructions: rawInstructions = "", } = options;
    const instructions = rawInstructions.trim();
    const errors = [];
    let guidance;
    try {
        // Step 1: Extract columns and create intelligent mapping
        const columnHeaders = (0, excelToJson_service_1.getExcelColumns)(excelBuffer);
        console.log("Detected columns:", columnHeaders);
        if (columnHeaders.length === 0) {
            throw new Error("No columns detected in Excel file");
        }
        // Step 2: Use OpenAI to map columns intelligently based on email type
        const mappingResult = yield (0, columnMapper_service_1.mapExcelColumns)(columnHeaders);
        console.log("Column mapping result:", mappingResult);
        if (!mappingResult.mapping.companyName) {
            const fallbackCompany = columnHeaders.find((header) => /^(company|business|name)/i.test(header.trim()));
            if (fallbackCompany) {
                mappingResult.mapping.companyName = fallbackCompany;
            }
        }
        if (!mappingResult.mapping.email) {
            const fallbackEmail = columnHeaders.find((header) => /email/i.test(header.trim()));
            if (fallbackEmail) {
                mappingResult.mapping.email = fallbackEmail;
            }
        }
        // Step 3: Convert Excel to JSON
        const jsonData = (0, excelToJson_service_1.convertExcelToJson)(excelBuffer);
        console.log(`Processing ${jsonData.length} companies`);
        // Step 4: Check if we need clear instructions from the user
        if (!instructions) {
            const sampleRow = jsonData[0];
            const sampleDetails = getValueFromRow(sampleRow, mappingResult.mapping.details);
            const sampleWebsite = getValueFromRow(sampleRow, mappingResult.mapping.website);
            if (!sampleDetails && !sampleWebsite) {
                guidance = yield generateInstructionGuidance(columnHeaders, sampleRow);
                return {
                    results: [],
                    columnMapping: mappingResult.mapping,
                    unmappedColumns: mappingResult.unmappedColumns,
                    totalProcessed: 0,
                    errors: [],
                    requiresInstructions: true,
                    guidance,
                };
            }
        }
        // Step 5: Process companies in batches
        const results = [];
        const batchSize = maxConcurrentRequests;
        let needsInstructions = false;
        let guidanceSampleRow = undefined;
        for (let i = 0; i < jsonData.length; i += batchSize) {
            const batch = jsonData.slice(i, i + batchSize);
            console.log(`Processing batch ${Math.floor(i / batchSize) + 1}:`, batch.length, "companies");
            const batchPromises = batch.map((row) => __awaiter(void 0, void 0, void 0, function* () {
                return yield processCompanyRow(row, mappingResult.mapping, myInfo, scrapeWebsites, instructions);
            }));
            try {
                const batchResults = yield Promise.allSettled(batchPromises);
                batchResults.forEach((result, index) => {
                    var _a;
                    if (result.status === "fulfilled" && result.value) {
                        results.push(result.value);
                    }
                    else if (result.status === "rejected") {
                        const companyRow = batch[index];
                        const companyName = getValueFromRow(companyRow, mappingResult.mapping.companyName) ||
                            `Company ${i + index + 1}`;
                        if ((_a = result.reason) === null || _a === void 0 ? void 0 : _a.isMissingInstructions) {
                            needsInstructions = true;
                            guidanceSampleRow = guidanceSampleRow || companyRow;
                            errors.push(`Skipped ${companyName}: more instructions needed.`);
                        }
                        else {
                            errors.push(`Failed to process ${companyName}: ${result.reason}`);
                        }
                    }
                });
            }
            catch (batchError) {
                errors.push(`Batch processing error: ${batchError}`);
            }
            // Add a small delay between batches to avoid overwhelming APIs
            if (i + batchSize < jsonData.length) {
                yield new Promise((resolve) => setTimeout(resolve, 1000));
            }
        }
        if (needsInstructions && !guidance) {
            guidance = yield generateInstructionGuidance(columnHeaders, guidanceSampleRow || jsonData[0]);
        }
        return {
            results,
            columnMapping: mappingResult.mapping,
            unmappedColumns: mappingResult.unmappedColumns,
            totalProcessed: jsonData.length,
            errors,
            requiresInstructions: Boolean(guidance),
            guidance,
        };
    }
    catch (error) {
        console.error("Error in bulkEmailFromExcel:", error);
        throw error;
    }
});
exports.bulkEmailFromExcel = bulkEmailFromExcel;
const processCompanyRow = (row, mapping, myInfo, scrapeWebsite, instructions) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log("Processing row:", row);
        const companyName = getValueFromRow(row, mapping.companyName);
        const email = getValueFromRow(row, mapping.email);
        console.log(`Processing row - mapping.companyName: "${mapping.companyName}"`);
        console.log(`Row keys: ${Object.keys(row)
            .map((k) => `"${k}"`)
            .join(", ")}`);
        console.log(`Extracted companyName: "${companyName}"`);
        if (!companyName) {
            throw new Error("Company name is required but not found");
        }
        const website = getValueFromRow(row, mapping.website);
        const industry = getValueFromRow(row, mapping.industry);
        const employees = getValueFromRow(row, mapping.employees);
        const type = getValueFromRow(row, mapping.type);
        const contactInfo = getValueFromRow(row, mapping.contactInfo);
        const establishedYear = getValueFromRow(row, mapping.establishedYear);
        let details = getValueFromRow(row, mapping.details);
        if (!details && website && scrapeWebsite) {
            try {
                const scrapedData = yield (0, websiteScraper_service_1.scrapeCompanyWebsite)(website);
                details = (0, websiteScraper_service_1.formatScrapedDataAsDetails)(scrapedData);
            }
            catch (scrapeError) {
                console.warn(`Failed to scrape website for ${companyName}:`, scrapeError);
            }
        }
        if (!instructions && !details) {
            const missingError = new Error(`Missing instructions for ${companyName}`);
            missingError.isMissingInstructions = true;
            missingError.companyName = companyName;
            throw missingError;
        }
        const companyDetails = {
            "COMPANY'S NAME": companyName,
            INDUSTRY: industry || "",
            TYPE: type || "",
            "Company's Website": website || "",
            Email: email || "",
            "No. of employees": employees || "",
            "ESTABLISHED YEAR": establishedYear || "",
            "Contact info": contactInfo || "",
        };
        const prompt = (0, emailPrompt_1.emailPrompt)(companyDetails, myInfo, instructions, details);
        const aiResponse = yield (0, openai_adapter_1.generateOpenAiResponse)(prompt, llmSystemRole_1.llmSystemRole.emailWriter);
        if (!(aiResponse === null || aiResponse === void 0 ? void 0 : aiResponse.parsedContent)) {
            throw new Error("Failed to generate email content");
        }
        const { subject, body } = aiResponse.parsedContent;
        return {
            company: companyName,
            email: email || "",
            subject: subject || "",
            body: body || "",
            website: website || "",
            industry: industry || "",
            employees: employees || "",
            type: type || "",
            details: details || "",
            instructionsUsed: instructions || undefined,
        };
    }
    catch (error) {
        console.error(`Error processing company row:`, error);
        throw error;
    }
});
const getValueFromRow = (row, columnName) => {
    if (!columnName || !row)
        return "";
    // Trim the column name to handle any whitespace issues
    const trimmedColumnName = columnName.trim();
    // Try exact match with trimmed column name first
    if (row[trimmedColumnName] !== undefined) {
        return String(row[trimmedColumnName]).trim();
    }
    // Try exact match with original column name
    if (row[columnName] !== undefined) {
        return String(row[columnName]).trim();
    }
    // Try case-insensitive match with trimmed names
    const keys = Object.keys(row);
    const matchingKey = keys.find((key) => key.trim().toLowerCase() === trimmedColumnName.toLowerCase());
    if (matchingKey && row[matchingKey] !== undefined) {
        return String(row[matchingKey]).trim();
    }
    // Try fuzzy matching for common variations
    const fuzzyMatchingKey = keys.find((key) => {
        const normalizedKey = key
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "");
        const normalizedColumnName = trimmedColumnName
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "");
        return normalizedKey === normalizedColumnName;
    });
    if (fuzzyMatchingKey && row[fuzzyMatchingKey] !== undefined) {
        return String(row[fuzzyMatchingKey]).trim();
    }
    return "";
};
function generateInstructionGuidance(columnHeaders, sampleRow) {
    return __awaiter(this, void 0, void 0, function* () {
        const defaultGuidance = {
            message: "We need a bit more context to draft the outreach email. Could you share the goal of this email and the offer you want to highlight?",
            suggestedQuestions: [
                "What service or product are we pitching to this contact?",
                "What outcome would you like from the recipient (call, reply, sign-up)?",
                "Is there any key proof point or incentive we should include?",
            ],
            examplePrompt: "Let them know we provide managed IT services and invite them to schedule a 20-minute discovery call next week.",
        };
        try {
            const serializedRow = sampleRow
                ? JSON.stringify(sampleRow, null, 2)
                : "No sample row data available";
            const prompt = `We attempted to create a cold outreach email but didn't have enough direction from the user.

Column headers detected: ${JSON.stringify(columnHeaders)}

Sample row data (may be empty if unavailable):
${serializedRow}

Please craft a friendly message encouraging the user to provide the missing details.`;
            const response = yield (0, openai_adapter_1.generateOpenAiResponse)(prompt, llmSystemRole_1.llmSystemRole.instructionCoach);
            const parsed = response === null || response === void 0 ? void 0 : response.parsedContent;
            if (parsed &&
                typeof parsed.message === "string" &&
                Array.isArray(parsed.suggestedQuestions) &&
                typeof parsed.examplePrompt === "string") {
                return parsed;
            }
        }
        catch (guidanceError) {
            console.warn("Failed to generate instruction guidance via LLM:", guidanceError);
        }
        return defaultGuidance;
    });
}
