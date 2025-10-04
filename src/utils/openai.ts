import OpenAI from "openai";
const client = new OpenAI({ apiKey: process.env.OPEN_AI_API_KEY });

export async function getOpenAIResponse(userMessage: string): Promise<string> {
  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: userMessage }],
    });
    return completion.choices[0]?.message?.content || "Sorry, I didn’t get that.";
  } catch (error) {
    console.error("OpenAI error:", error);
    return "There was an error processing your request.";
  }
}
