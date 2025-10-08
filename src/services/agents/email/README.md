# Bulk Email Generation Service

A modular, intelligent service for generating personalized bulk emails from Excel files using OpenAI.

## Features

- ✅ **Intelligent Column Mapping**: Uses OpenAI to automatically map Excel columns to required fields
- ✅ **Flexible Excel Formats**: Supports various column naming conventions
- ✅ **Website Scraping**: Automatically extracts missing company details from websites
- ✅ **Batch Processing**: Handles large files with concurrent processing
- ✅ **Error Handling**: Comprehensive error tracking and recovery
- ✅ **Modular Architecture**: Separate services for easy maintenance and testing

## API Endpoints

### 1. Generate Bulk Emails
```
POST /api/v1/bulk-email/generate
```

**Headers:**
- `Authorization: Bearer <token>` (or cookie-based auth)
- `Content-Type: multipart/form-data`

**Body:**
- `excel_file` (file): Excel file containing company data
- `my_company_name` (string, optional): Your company name
- `my_company_website` (string, optional): Your company website
- `scrape_websites` (boolean, optional): Enable website scraping (default: true)
- `max_concurrent_requests` (number, optional): Max concurrent processing (default: 5)

**Response:**
```json
{
  "message": "Bulk email generation completed successfully",
  "data": {
    "emails": [
      {
        "company": "Tech Corp",
        "website": "techcorp.com",
        "email": "info@techcorp.com",
        "details": "Software development company...",
        "subject": "Streamline Your Tech Operations with Our Solutions",
        "body": "Dear Tech Corp team,\n\nI hope this email finds you well..."
      }
    ],
    "summary": {
      "totalProcessed": 10,
      "successfulGenerations": 9,
      "errorCount": 1,
      "columnMappingUsed": {
        "companyName": "Company Name",
        "website": "Website URL",
        "email": "Contact Email"
      },
      "unmappedColumns": ["Notes"]
    }
  }
}
```

### 2. Preview Column Mapping
```
POST /api/v1/bulk-email/preview
```

**Purpose:** Preview how columns will be mapped without processing the entire file.

**Response:**
```json
{
  "message": "Column mapping preview generated successfully",
  "data": {
    "detectedColumns": ["Company Name", "Website", "Email", "Type"],
    "suggestedMapping": {
      "companyName": "Company Name",
      "website": "Website",
      "email": "Email",
      "industry": "",
      "type": "Type"
    },
    "confidence": 0.95,
    "unmappedColumns": []
  }
}
```

## Excel File Formats Supported

The service intelligently handles various Excel column formats:

### Standard Format
| Company Name | Website | Email | Industry | Details |
|--------------|---------|-------|----------|---------|
| Tech Corp | techcorp.com | info@tech.com | Technology | Software dev |

### Alternative Formats
- `COMPANY'S NAME`, `Company's Name`, `Business Name`, `Name`
- `Website`, `URL`, `Company Website`, `Web`
- `Email`, `Email Address`, `Contact Email`
- `Industry`, `Sector`, `Business Type`, `Type`
- `Details`, `Description`, `About`, `Company Details`

## Service Architecture

### Core Services

1. **excelToJson.service.ts**
   - Converts Excel files to JSON
   - Extracts column headers
   - Handles various Excel formats

2. **columnMapper.service.ts**
   - Uses OpenAI to intelligently map columns
   - Provides fallback pattern matching
   - Returns confidence scores

3. **websiteScraper.service.ts**
   - Scrapes company websites for missing details
   - Extracts company descriptions, services, contact info
   - Handles errors gracefully

4. **bulkEmailFromExcel.service.ts**
   - Main orchestrator service
   - Coordinates all other services
   - Handles batch processing and error management

### Processing Flow

```
Excel File → Column Detection → AI Mapping → JSON Conversion → 
Website Scraping (if needed) → Email Generation → Results
```

## Usage Examples

### Basic Usage
```typescript
import { bulkEmailFromExcel } from './services/agents/email/bulkEmailFromExcel.service';

const result = await bulkEmailFromExcel(excelBuffer, {
  my_company_name: "Your Company",
  my_company_website: "yourcompany.com"
});
```

### With Options
```typescript
const result = await bulkEmailFromExcel(excelBuffer, myCompanyInfo, {
  scrapeWebsites: true,
  maxConcurrentRequests: 3
});
```

## Error Handling

The service provides comprehensive error handling:

- **File validation**: Checks file type and format
- **Column mapping failures**: Falls back to pattern matching
- **Website scraping errors**: Continues processing without blocking
- **OpenAI API errors**: Logs errors and continues with available data
- **Batch processing**: Isolates errors to individual companies

## Performance Considerations

- **Batch Processing**: Processes companies in configurable batches
- **Rate Limiting**: Respects API rate limits with delays between batches
- **Memory Management**: Streams large Excel files
- **Concurrent Requests**: Configurable concurrency for website scraping

## Dependencies

- `xlsx`: Excel file processing
- `axios`: HTTP requests for website scraping
- `openai`: AI-powered column mapping and email generation

## Environment Variables Required

- `OPEN_AI_API_KEY`: OpenAI API key for AI services

## Testing

Run the service with sample Excel files to test various formats and edge cases.

## Future Enhancements

- [ ] Support for CSV files
- [ ] Email template customization
- [ ] Integration with email delivery services
- [ ] Advanced website scraping with JavaScript rendering
- [ ] Bulk email scheduling and tracking