import OpenAI from "openai";

export function getOpenAIClient() {
  return new OpenAI({
    apiKey: process.env["OPENAI_API_KEY"],
  });
} 