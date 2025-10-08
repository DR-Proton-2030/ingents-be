# Bulk Email Instructions Workflow

## Overview

The bulk email pipeline now follows a single, instruction-driven workflow. Instead of guessing whether the uploaded Excel belongs to a B2B or B2C campaign, the system simply:

1. Reads company columns from the spreadsheet (company name, email, website, etc.)
2. Uses any explicit instructions provided by the user to craft the outreach email
3. Falls back to the available company details (including optional website scraping) when instructions are missing
4. Politely asks the user for guidance if there isn’t enough information to proceed

## How to Use

```typescript
const options: ProcessingOptions = {
  instructions: "Announce our new managed IT services and invite them to schedule a 20-minute call.",
  scrapeWebsites: true,
  maxConcurrentRequests: 5
};

const result = await bulkEmailFromExcel(excelBuffer, myCompanyInfo, options);
```

### Supplying Instructions
- Prefer sending a short prompt describing the goal of the email (e.g., “Promote our Black Friday offer and include a discount code”).
- The API automatically looks for these fields on the request body: `instructions`, `emailInstructions`, `emailTopic`, `prompt`, `goal`.
- Whatever string is found is trimmed and passed straight to the LLM.

### When Instructions Are Missing
- If the Excel file contains rich details (e.g., industry, company description, website), the model will still attempt a personalized email.
- If both instructions and meaningful details are missing, the service throws:

```
Error: MISSING_INSTRUCTIONS: Please let us know what kind of outreach email you want to send.
```

This allows the UI to ask the user for a simple follow-up prompt instead of guessing.

## Column Mapping Intelligence

The system still detects company-related columns automatically:

- **Company Name:** “Company Name”, “COMPANY'S NAME”, “Business Name”, etc.
- **Email:** “Email”, “Email Address”, “Contact Email”, etc.
- **Website:** “Website”, “URL”, “Company Website”, etc.
- **Industry / Type / Employees / Contact Info / Details** are also recognized through flexible pattern matching.

Any unmapped columns are returned in the response so the UI can show them for manual assignment if needed.

## Response Structure (`BulkEmailResult`)

```typescript
interface BulkEmailResult {
  company: string;
  email: string;
  subject: string;
  body: string;
  website?: string;
  industry?: string;
  employees?: string;
  type?: string;
  details?: string;
  instructionsUsed?: string;
}
```

- `instructionsUsed` echoes the prompt that guided the LLM (if any) for easy auditing.

## Controller Integration

```typescript
const rawInstructions = req.body.instructions
  || req.body.emailInstructions
  || req.body.emailTopic
  || req.body.prompt
  || req.body.goal
  || "";

const options: ProcessingOptions = {
  instructions: rawInstructions.trim() || undefined,
  scrapeWebsites: req.body.scrape_websites !== 'false',
  maxConcurrentRequests: Number(req.body.max_concurrent_requests) || 5,
};

const result = await bulkEmailFromExcel(req.file.buffer, myCompanyInfo, options);
```

## Error Handling Cheatsheet

| Scenario | System Behaviour | Suggested UI Action |
|----------|------------------|----------------------|
| No file uploaded | `400` with `"Excel file is required"` | Prompt user to upload a sheet |
| Missing company name column | Error per row, added to `errors[]` | Show in results table |
| No instructions **and** no usable details | Throws `MISSING_INSTRUCTIONS` | Ask user “What would you like the email to achieve?” |
| Website scraping fails | Warning logged, continues with available data | Optional toast notification |

## Best Practices

1. Encourage users to provide a one-line goal; it dramatically improves email quality.
2. Keep Excel headers clean (trim extra spaces) for higher mapping confidence.
3. When scraping is enabled, respect rate limits by keeping `maxConcurrentRequests` small (default `5`).
4. Store `instructionsUsed` alongside generated emails for audit trails.

This simplified, instruction-first flow is easier for end users and avoids incorrect assumptions about their business model.