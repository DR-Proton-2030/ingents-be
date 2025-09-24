export const columnMapping: Record<string, string[]> = {
  company_name: ["company's name", "company name", "companies", "company"],
  company_industry: ["industry", "company industry", "sector"],
  no_of_employees: ["no. of employees", "employees", "employee count", "number of employees"],
  type: ["type", "company type", "business type"],
  role: ["role", "position"],
  company_email: ["email", "company email", "email address"],
  company_website: ["company's website", "website", "site", "company website"],
  contact_number: ["contact info", "phone", "contact number", "mobile"],
};

export function getFieldValue(row: any, aliases: string[]): any {
  for (const alias of aliases) {
    const key = Object.keys(row).find(k => k.toLowerCase() === alias.toLowerCase());
    if (key && row[key] !== undefined) return row[key];
  }
  return null;
}
