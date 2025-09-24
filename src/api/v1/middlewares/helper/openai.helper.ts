import OpenAI from "openai";
import { MyCompanyInfo, CompanyDetails } from "../../../../types/interface/openai.interface";
import { emailPrompt } from "../../../../prompts/emailPrompt";

const openai = new OpenAI({
  apiKey: process.env.OPEN_AI_API_KEY,
});

const systemMessage =
  "You are a senior marketing strategist and professional email copywriter. You specialize in writing personalized cold emails that maximize engagement and response rates. Always output in valid JSON format only.";

export const generateEmailBody = async (
  companyDetails: CompanyDetails,
  myCompanyInfo: MyCompanyInfo
) => {
  try {
    const prompt = emailPrompt(companyDetails, myCompanyInfo);

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: prompt },
      ],
      max_tokens: 500,
      temperature: 0.7,
      top_p: 0.9,
      presence_penalty: 0.2,
      frequency_penalty: 0.3,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content;
    if (content === null) throw new Error("OpenAI response content is null");

    const parsedContent = JSON.parse(content);

    // Return both the generated email and the prompt
    return {
      prompt,
      subject: parsedContent.subject,
      body: parsedContent.body,
    };
  } catch (err) {
    console.error("OpenAI request failed:", err);
    return null;
  }
};
