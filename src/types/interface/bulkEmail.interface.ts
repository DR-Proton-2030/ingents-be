export interface ExcelToJsonOptions {
  sheetIndex?: number;
  headerRow?: number;
}
export interface BulkEmailResult {
  company: string;
  website: string;
  email: string;
  details: string;
  subject: string;
  body: string;
  industry?: string;
  employees?: string;
  type?: string;
  mappingConfidence?: number;
}

export interface ProcessingOptions {
  scrapeWebsites?: boolean;
  includeUnmappedColumns?: boolean;
  maxConcurrentRequests?: number;
}

export interface BulkEmailFromExcelResponse {
  results: BulkEmailResult[];
  columnMapping: any;
  unmappedColumns: string[];
  totalProcessed: number;
  errors: string[];
}

export interface FieldMapping {
  companyName: string;
  website: string;
  email: string;
  industry: string;
  type: string;
  employees: string;
  establishedYear: string;
  contactInfo: string;
  details: string;
}

export interface MappingResult {
  mapping: FieldMapping;
  confidence: number;
  unmappedColumns: string[];
}
