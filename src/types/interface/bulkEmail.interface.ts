export interface ExcelToJsonOptions {
  sheetIndex?: number;
  headerRow?: number;
}
export interface BulkEmailResult {
  company: string;
  email: string;
  subject: string;
  body: string;
  website?: string;
  industry?: string;
  employees?: string;
  type?: string;
  details?: string;
  mappingConfidence?: number;
  instructionsUsed?: string;
}

export interface ProcessingOptions {
  scrapeWebsites?: boolean;
  includeUnmappedColumns?: boolean;
  maxConcurrentRequests?: number;
  instructions?: string;
}

export interface BulkEmailFromExcelResponse {
  results: BulkEmailResult[];
  columnMapping: FieldMapping;
  unmappedColumns: string[];
  totalProcessed: number;
  errors: string[];
  requiresInstructions?: boolean;
  guidance?: InstructionGuidance;
}

export interface InstructionGuidance {
  message: string;
  suggestedQuestions: string[];
  examplePrompt: string;
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
  name?: string;
  firstName?: string;
  lastName?: string;
  customerSegment?: string;
  preferences?: string;
}

export interface MappingResult {
  mapping: FieldMapping;
  confidence: number;
  unmappedColumns: string[];
}
