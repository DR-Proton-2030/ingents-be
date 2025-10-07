import {
  CompanyDetails,
  MyCompanyInfo,
} from "../../types/interface/openai.interface";

export const emailPrompt = (
  companyDetails: CompanyDetails,
  myInfo: MyCompanyInfo
): string => {
  const withField = (label: string, value?: string | number) =>
    value ? `- ${label}: ${value}\n` : "";

  return `
You are a professional business development email writer. 
Return the result strictly in JSON format with the following structure:

{
  "subject": "string",
  "body": "string"
}

Write a personalized, ready-to-send outreach email to the company:

${withField("Company Name", companyDetails["COMPANY'S NAME"])}
${withField("Industry", companyDetails["INDUSTRY"])}
${withField("Type", companyDetails["TYPE"])}
${withField("Website", companyDetails["Company's Website"])}
${withField("Email", companyDetails["Email"])}

Use the following information about **my company** (the sender):
${withField("Company Name", myInfo.my_company_name)}
${withField("Website", myInfo.my_company_website)}

- Services: Fetch from the company's website what they do and what they provide and generate the email based on that.

📌 Email Writing Guidelines:
1. Start with a professional and friendly greeting, addressing the recipient company.
2. Mention their industry, size, or business background, showing that the email is personalized to their profile.
3. Highlight possible needs or challenges they may have (based on their industry or business type) where our IT services can add value.
4. Clearly explain what we offer and why it is relevant to their business.
5. Include a **call to action** (e.g., scheduling a call, replying for more details, or visiting our website).
6. Keep the tone professional, concise, and engaging.
7. Avoid placeholders – the email should be ready to send.

Now, generate the full email body accordingly.
`;
};
