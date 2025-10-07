/**
 * Bulk Email Generation Service - Usage Examples
 * 
 * This service intelligently processes Excel files to generate personalized bulk emails.
 * It uses OpenAI to map Excel columns and generate email content.
 */

import { bulkEmailFromExcel } from "./bulkEmailFromExcel.service";
import { MyCompanyInfo } from "../../../types/interface/openai.interface";
import * as fs from "fs";

// Example usage function
export const exampleUsage = async () => {
  try {
    // Example 1: Basic usage with Excel file
    const excelFilePath = "/path/to/companies.xlsx";
    const excelBuffer = fs.readFileSync(excelFilePath);
    
    const myCompanyInfo: MyCompanyInfo = {
      my_company_name: "TechSolutions Inc.",
      my_company_website: "https://techsolutions.com"
    };

    const result = await bulkEmailFromExcel(excelBuffer, myCompanyInfo);
    
    console.log("Processing Results:");
    console.log(`- Total companies: ${result.totalProcessed}`);
    console.log(`- Successful emails: ${result.results.length}`);
    console.log(`- Errors: ${result.errors.length}`);
    console.log(`- Column mapping used:`, result.columnMapping);
    
    // Example 2: With custom options
    const customOptions = {
      scrapeWebsites: true,
      maxConcurrentRequests: 3
    };
    
    const customResult = await bulkEmailFromExcel(
      excelBuffer, 
      myCompanyInfo, 
      customOptions
    );
    
    // Example 3: Processing results
    customResult.results.forEach((email, index) => {
      console.log(`\n--- Email ${index + 1} ---`);
      console.log(`Company: ${email.company}`);
      console.log(`Website: ${email.website}`);
      console.log(`Subject: ${email.subject}`);
      console.log(`Body Preview: ${email.body.substring(0, 100)}...`);
    });
    
  } catch (error) {
    console.error("Error in bulk email generation:", error);
  }
};

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

export const supportedExcelFormats = {
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