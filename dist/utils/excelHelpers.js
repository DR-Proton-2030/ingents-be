"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFieldValue = exports.columnMapping = void 0;
exports.columnMapping = {
    company_name: ["company's name", "company name", "companies", "company"],
    company_industry: ["industry", "company industry", "sector", "companie's industry"],
    no_of_employees: ["no. of employees", "employees", "employee count", "number of employees", "total employees"],
    type: ["type", "company type", "business type", "type of the company"],
    role: ["role", "position"],
    company_email: ["email", "company email", "email address", "company email id", "email id"],
    company_website: ["company's website", "website", "site", "company website"],
    contact_number: ["contact info", "phone", "contact number", "mobile"],
};
function getFieldValue(row, aliases) {
    for (const alias of aliases) {
        const key = Object.keys(row).find(k => k.toLowerCase() === alias.toLowerCase());
        if (key && row[key] !== undefined)
            return row[key];
    }
    return null;
}
exports.getFieldValue = getFieldValue;
