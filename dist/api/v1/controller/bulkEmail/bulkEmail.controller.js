"use strict";
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
exports.getBulkEmailPreview = exports.bulkEmailGenerationFromExcel = void 0;
const processBulkEmailFromExcel_1 = require("../../../../services/agents/email/processBulkEmailFromExcel");
const bulkEmailGenerationFromExcel = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const { result, requiresInstructions } = yield (0, processBulkEmailFromExcel_1.processBulkEmailGenerationFromExcel)(req);
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
    }
    catch (error) {
        let status = 500;
        let message = "Failed to process Excel file for bulk email generation";
        if ((_a = error === null || error === void 0 ? void 0 : error.message) === null || _a === void 0 ? void 0 : _a.includes("Excel file is required")) {
            status = 400;
            message = "Excel file is required";
        }
        else if ((_b = error === null || error === void 0 ? void 0 : error.message) === null || _b === void 0 ? void 0 : _b.includes("Company name is required")) {
            status = 400;
            message = "Company name is required";
        }
        else if ((_c = error === null || error === void 0 ? void 0 : error.message) === null || _c === void 0 ? void 0 : _c.includes("Invalid file type")) {
            status = 400;
            message = "Invalid file type. Please upload an Excel file (.xlsx or .xls)";
        }
        console.error("Error in bulk email generation:", error);
        res.status(status).json({
            message,
            error: error instanceof Error ? error.message : "Unknown error occurred"
        });
    }
});
exports.bulkEmailGenerationFromExcel = bulkEmailGenerationFromExcel;
const getBulkEmailPreview = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // This endpoint can be used to preview column mapping without processing
        if (!req.file || !req.file.buffer) {
            return res.status(400).json({
                message: "Excel file is required",
                error: "No file uploaded"
            });
        }
        const { getExcelColumns } = yield Promise.resolve().then(() => __importStar(require("../../../../services/agents/email/excelToJson.service")));
        const { mapExcelColumns } = yield Promise.resolve().then(() => __importStar(require("../../../../services/agents/email/columnMapper.service")));
        // Extract columns and create mapping preview
        const columnHeaders = getExcelColumns(req.file.buffer);
        const mappingResult = yield mapExcelColumns(columnHeaders);
        res.status(200).json({
            message: "Column mapping preview generated successfully",
            data: {
                detectedColumns: columnHeaders,
                suggestedMapping: mappingResult.mapping,
                confidence: mappingResult.confidence,
                unmappedColumns: mappingResult.unmappedColumns
            }
        });
    }
    catch (error) {
        console.error("Error in bulk email preview:", error);
        res.status(500).json({
            message: "Failed to preview Excel file mapping",
            error: error instanceof Error ? error.message : "Unknown error occurred"
        });
    }
});
exports.getBulkEmailPreview = getBulkEmailPreview;
