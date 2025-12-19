"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getExcelColumns = exports.convertExcelToJson = void 0;
const xlsx_1 = __importDefault(require("xlsx"));
const convertExcelToJson = (excelBuffer, options = {}) => {
    try {
        const { sheetIndex = 0, headerRow = 1 } = options;
        const workbook = xlsx_1.default.read(excelBuffer, { type: "buffer" });
        const sheetName = workbook.SheetNames[sheetIndex];
        if (!sheetName) {
            throw new Error(`Sheet at index ${sheetIndex} not found`);
        }
        const sheet = workbook.Sheets[sheetName];
        // Get the headers first
        const headers = (0, exports.getExcelColumns)(excelBuffer, sheetIndex);
        console.log("Headers extracted:", headers);
        // Convert to JSON using the first row as headers
        const rawJsonData = xlsx_1.default.utils.sheet_to_json(sheet, {
            header: 1, // Use first row as headers
            defval: "", // Default value for empty cells
            range: 1 // Skip first row since it contains headers
        });
        console.log(`Raw Excel data rows: ${rawJsonData.length}`);
        // Transform the data to use proper header names instead of numeric indices
        const transformedData = rawJsonData.map(row => {
            const newRow = {};
            headers.forEach((header, index) => {
                const trimmedHeader = header.trim();
                newRow[trimmedHeader] = row[index] || "";
            });
            return newRow;
        });
        console.log(`Transformed data rows: ${transformedData.length}`);
        if (transformedData.length > 0) {
            console.log("Sample transformed row:", JSON.stringify(transformedData[0], null, 2));
        }
        return transformedData;
    }
    catch (error) {
        console.error("Error converting Excel to JSON:", error);
        throw new Error("Failed to convert Excel file to JSON");
    }
};
exports.convertExcelToJson = convertExcelToJson;
const getExcelColumns = (excelBuffer, sheetIndex = 0) => {
    try {
        const workbook = xlsx_1.default.read(excelBuffer, { type: "buffer" });
        const sheetName = workbook.SheetNames[sheetIndex];
        const sheet = workbook.Sheets[sheetName];
        // Get the first row (headers)
        const range = xlsx_1.default.utils.decode_range(sheet['!ref'] || 'A1');
        const headers = [];
        for (let col = range.s.c; col <= range.e.c; col++) {
            const cellAddress = xlsx_1.default.utils.encode_cell({ r: 0, c: col });
            const cell = sheet[cellAddress];
            if (cell && cell.v) {
                // Trim whitespace from headers to handle cases like "COMPANY'S NAME "
                headers.push(String(cell.v).trim());
            }
        }
        return headers;
    }
    catch (error) {
        console.error("Error extracting Excel columns:", error);
        return [];
    }
};
exports.getExcelColumns = getExcelColumns;
