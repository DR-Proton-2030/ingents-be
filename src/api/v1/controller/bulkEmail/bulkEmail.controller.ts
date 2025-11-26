import { Request, Response } from "express";
import { bulkEmailFromExcel } from "../../../../services/agents/email/bulkEmailFromExcel.service";
import { MyCompanyInfo } from "../../../../types/interface/openai.interface";
import { processBulkEmailGenerationFromExcel } from "../../../../services/agents/email/processBulkEmailFromExcel";

export const bulkEmailGenerationFromExcel = async (req: Request, res: Response) => {
  try {
    const { result, requiresInstructions } = await processBulkEmailGenerationFromExcel(req);
    if (!result) {
      return res.status(400).json({
        message: "Failed to process Excel file for bulk email generation",
        error: "No result returned"
      });
    }
    const response = {
      message: requiresInstructions
        ? "We need a bit more direction before we can generate your outreach emails."
        : "Bulk email generation completed successfully",
      data: {
        emails: result.results,
        summary: {
          totalProcessed: result.totalProcessed,
          successfulGenerations: result.results.length,
          errorCount: result.errors.length,
          columnMappingUsed: result.columnMapping,
          unmappedColumns: result.unmappedColumns,
          requiresInstructions,
        },
        errors: result.errors,
        guidance: result.guidance,
        processing_options: result.options,
      }
    };
    res.status(200).json(response);
  } catch (error: any) {
    let status = 500;
    let message = "Failed to process Excel file for bulk email generation";
    if (error?.message?.includes("Excel file is required")) {
      status = 400;
      message = "Excel file is required";
    } else if (error?.message?.includes("Company name is required")) {
      status = 400;
      message = "Company name is required";
    } else if (error?.message?.includes("Invalid file type")) {
      status = 400;
      message = "Invalid file type. Please upload an Excel file (.xlsx or .xls)";
    }
    console.error("Error in bulk email generation:", error);
    res.status(status).json({
      message,
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