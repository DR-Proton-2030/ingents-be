import xlsx from "xlsx";
import { ExcelToJsonOptions } from "../../../types/interface/bulkEmail.interface";

export const convertExcelToJson = (
  excelBuffer: Buffer,
  options: ExcelToJsonOptions = {}
): any[] => {
  try {
    const { sheetIndex = 0, headerRow = 1 } = options;
    
    const workbook = xlsx.read(excelBuffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[sheetIndex];
    
    if (!sheetName) {
      throw new Error(`Sheet at index ${sheetIndex} not found`);
    }
    
    const sheet = workbook.Sheets[sheetName];
    const jsonData: any[] = xlsx.utils.sheet_to_json(sheet, {
      header: headerRow,
      defval: "", // Default value for empty cells
    });

    return jsonData;
  } catch (error) {
    console.error("Error converting Excel to JSON:", error);
    throw new Error("Failed to convert Excel file to JSON");
  }
};

export const getExcelColumns = (excelBuffer: Buffer, sheetIndex: number = 0): string[] => {
  try {
    const workbook = xlsx.read(excelBuffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[sheetIndex];
    const sheet = workbook.Sheets[sheetName];
    
    // Get the first row (headers)
    const range = xlsx.utils.decode_range(sheet['!ref'] || 'A1');
    const headers: string[] = [];
    
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = xlsx.utils.encode_cell({ r: 0, c: col });
      const cell = sheet[cellAddress];
      if (cell && cell.v) {
        headers.push(String(cell.v));
      }
    }
    
    return headers;
  } catch (error) {
    console.error("Error extracting Excel columns:", error);
    return [];
  }
};