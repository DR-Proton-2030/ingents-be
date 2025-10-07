import { Request, Response } from "express";
import { bulkEmailFromExcel } from "../../../../services/agents/email/bulkEmailFromExcel.service";
import { MyCompanyInfo } from "../../../../types/interface/openai.interface";

export const bulkEmailGenerationFromExcel = async (req: Request, res: Response) => {
  try {
    // Validate that file was uploaded
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        message: "Excel file is required",
        error: "No file uploaded"
      });
    }

    // Validate file type
    const allowedMimeTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'application/excel',
      'application/x-excel'
    ];

    if (!allowedMimeTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        message: "Invalid file type. Please upload an Excel file (.xlsx or .xls)",
        error: "Unsupported file format"
      });
    }

    // Extract company info from request body
    const myCompanyInfo: MyCompanyInfo = {
      my_company_name: req.body.my_company_name || req.user?.company_details?.company_name || "",
      my_company_website: req.body.my_company_website || req.user?.company_details?.company_website || ""
    };

    // Validate required company info
    if (!myCompanyInfo.my_company_name) {
      return res.status(400).json({
        message: "Company name is required",
        error: "Missing my_company_name in request body or user profile"
      });
    }

    // Processing options from request
    const options = {
      scrapeWebsites: req.body.scrape_websites !== 'false', // Default true
      maxConcurrentRequests: parseInt(req.body.max_concurrent_requests) || 5
    };

    console.log(`Processing Excel file for bulk email generation. Company: ${myCompanyInfo.my_company_name}`);

    // Process the Excel file
    const result = await bulkEmailFromExcel(req.file.buffer, myCompanyInfo, options);

    // Log processing summary
    console.log(`Bulk email processing completed:
      - Total companies processed: ${result.totalProcessed}
      - Successful email generations: ${result.results.length}
      - Errors: ${result.errors.length}
      - Column mapping confidence: ${result.columnMapping}
    `);

    // Prepare response
    const response = {
      message: "Bulk email generation completed successfully",
      data: {
        emails: result.results,
        summary: {
          totalProcessed: result.totalProcessed,
          successfulGenerations: result.results.length,
          errorCount: result.errors.length,
          columnMappingUsed: result.columnMapping,
          unmappedColumns: result.unmappedColumns
        },
        processing_options: options
      }
    };

    // Include errors in response if any
    if (result.errors.length > 0) {
      response.data.summary = {
        ...response.data.summary,
        errors: result.errors
      } as any;
    }

    res.status(200).json(response);

  } catch (error) {
    console.error("Error in bulk email generation:", error);
    
    res.status(500).json({
      message: "Failed to process Excel file for bulk email generation",
      error: error instanceof Error ? error.message : "Unknown error occurred"
    });
  }
};

export const getBulkEmailPreview = async (req: Request, res: Response) => {
  try {
    // This endpoint can be used to preview column mapping without processing
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        message: "Excel file is required",
        error: "No file uploaded"
      });
    }

    const { getExcelColumns } = await import("../../../../services/agents/email/excelToJson.service");
    const { mapExcelColumns } = await import("../../../../services/agents/email/columnMapper.service");

    // Extract columns and create mapping preview
    const columnHeaders = getExcelColumns(req.file.buffer);
    const mappingResult = await mapExcelColumns(columnHeaders);

    res.status(200).json({
      message: "Column mapping preview generated successfully",
      data: {
        detectedColumns: columnHeaders,
        suggestedMapping: mappingResult.mapping,
        confidence: mappingResult.confidence,
        unmappedColumns: mappingResult.unmappedColumns
      }
    });

  } catch (error) {
    console.error("Error in bulk email preview:", error);
    
    res.status(500).json({
      message: "Failed to preview Excel file mapping",
      error: error instanceof Error ? error.message : "Unknown error occurred"
    });
  }
};