import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPEN_AI_API_KEY,
});

export const generateOpenAiResponse = async (
    prompt: string,
    systemMessage: string
) => {
  try {

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
      parsedContent,
    };
  } catch (err) {
    console.error("OpenAI request failed:", err);
    return null;
  }
};

export async function getOpenAIEmbeddings(text: string) {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return response.data[0].embedding;
}