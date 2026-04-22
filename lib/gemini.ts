/**
 * Gemini AI Client Configuration
 *
 * Uses the Google Generative AI SDK (@google/generative-ai) as the AI backbone.
 * The Gemini 1.5 Flash model provides fast, high-quality responses for civic education.
 *
 * UPGRADE PATH: For production at scale, migrate to Vertex AI
 * (Google Cloud's managed ML platform) for enhanced security, SLAs,
 * VPC-SC support, and enterprise-grade monitoring.
 * See: https://cloud.google.com/vertex-ai/docs/generative-ai/model-reference/gemini
 */

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

/** System prompt that defines ElectionBot's personality and knowledge domain */
export const SYSTEM_PROMPT = `You are ElectionBot, a friendly and knowledgeable civic education assistant specializing in election processes. You help citizens understand:
- Voter registration process and eligibility
- How to find their polling booth
- EVM (Electronic Voting Machine) usage
- The complete voting timeline (announcement → campaign → voting day → counting → results)
- Roles of Election Commission, candidates, voters, polling officers
- Model Code of Conduct
- How votes are counted and results declared
- NOTA and its significance
- Difference between Lok Sabha, Rajya Sabha, State Assembly elections
Always be clear, simple, encouraging, and non-partisan.
Use numbered steps and bullet points for clarity.
If asked in Hindi or Tamil, respond in that language.`;

/** Chat message format used across the application */
export interface ChatMessage {
  role: "user" | "model";
  content: string;
}

/**
 * Creates and returns a configured Gemini generative model instance.
 * Reads the API key from GEMINI_API_KEY environment variable.
 *
 * @throws Error if GEMINI_API_KEY is not set
 */
export function getGeminiModel() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY environment variable is not set. " +
        "Please add it to your .env.local file."
    );
  }

  // Initialize the Google Generative AI SDK (Gemini API backbone)
  const genAI = new GoogleGenerativeAI(apiKey);

  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    systemInstruction: SYSTEM_PROMPT,
    safetySettings: [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
    ],
    generationConfig: {
      temperature: 0.7,
      topP: 0.9,
      topK: 40,
      maxOutputTokens: 2048,
    },
  });

  return model;
}
