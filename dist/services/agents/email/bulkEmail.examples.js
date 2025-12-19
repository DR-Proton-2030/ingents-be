"use strict";
/**
 * Bulk Email Generation Service - Usage Examples
 *
 * This service intelligently processes Excel files to generate personalized bulk emails.
 * It uses OpenAI to map Excel columns and generate email content.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
exports.supportedExcelFormats = exports.exampleUsage = void 0;
const bulkEmailFromExcel_service_1 = require("./bulkEmailFromExcel.service");
const fs = __importStar(require("fs"));
// Example usage function
const exampleUsage = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Example 1: Basic usage with Excel file
        const excelFilePath = "/path/to/companies.xlsx";
        const excelBuffer = fs.readFileSync(excelFilePath);
        const myCompanyInfo = {
            my_company_name: "TechSolutions Inc.",
            my_company_website: "https://techsolutions.com"
        };
        // Example with explicit instructions
        const result = yield (0, bulkEmailFromExcel_service_1.bulkEmailFromExcel)(excelBuffer, myCompanyInfo, {
            instructions: "Write a concise cold email introducing our managed IT services and invite them to a discovery call."
        });
        console.log("Processing Results:");
        console.log(`- Total companies: ${result.totalProcessed}`);
        console.log(`- Successful emails: ${result.results.length}`);
        console.log(`- Errors: ${result.errors.length}`);
        console.log(`- Column mapping used:`, result.columnMapping);
        // Example 2: With website scraping and concurrency control
        const customOptions = {
            instructions: "Highlight how our cybersecurity audit can reduce breach risk and ask for a 20-minute call.",
            scrapeWebsites: true,
            maxConcurrentRequests: 3
        };
        const customResult = yield (0, bulkEmailFromExcel_service_1.bulkEmailFromExcel)(excelBuffer, myCompanyInfo, customOptions);
        // Example 3: Processing results
        customResult.results.forEach((email, index) => {
            console.log(`\n--- Email ${index + 1} ---`);
            console.log(`Company: ${email.company}`);
            console.log(`Website: ${email.website || 'N/A'}`);
            console.log(`Subject: ${email.subject}`);
            console.log(`Body Preview: ${email.body.substring(0, 100)}...`);
        });
    }
    catch (error) {
        console.error("Error in bulk email generation:", error);
    }
});
exports.exampleUsage = exampleUsage;
/**
 * Sample Excel file formats supported:
 *
 * Format 1 (Standard):
 * | Company Name | Website | Email | Industry | Details |
 * | Tech Corp    | tech.com| hi@tech.com | Technology | Software development |
 *
 * Format 2 (Alternative column names):
 * | COMPANY'S NAME | Company's Website | Email Address | Type | Description |
 * | DataSoft LLC   | datasoft.net     | info@data.com | IT   | Data analytics |
 *
 * Format 3 (Minimal - other fields will be extracted from website):
 * | Name         | URL              | Contact Email |
 * | WebDev Pro   | webdevpro.com    | sales@web.com |
 *
 * The service will automatically:
 * 1. Detect and map columns using OpenAI
 * 2. Extract missing company details from websites
 * 3. Generate personalized emails for each company
 * 4. Handle errors gracefully and provide detailed feedback
 */
exports.supportedExcelFormats = {
    standardFormat: [
        "Company Name", "Website", "Email", "Industry", "Type",
        "No. of employees", "ESTABLISHED YEAR", "Contact info", "Details"
    ],
    flexibleColumns: [
        "Any variation of company name (Name, COMPANY'S NAME, Business Name, etc.)",
        "Any variation of website (URL, Web, Company Website, etc.)",
        "Any variation of email (Email Address, Contact Email, etc.)",
        "Industry, Sector, Business Type variations",
        "Employee count variations",
        "Contact information variations",
        "Company details/description variations"
    ]
};
