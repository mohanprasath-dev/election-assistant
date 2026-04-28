// Google Services Used:
// 1. Vertex AI - Primary AI inference engine for production workloads
// 2. Google Cloud Run - Serverless deployment platform (hosts this application)
// 3. Google Cloud Build - CI/CD pipeline for automated Docker builds
// 4. Google Container Registry - Docker image storage and management
// 5. Google Cloud Storage - Build artifact and static asset storage
// 6. Gemini 1.5 Flash - Foundation model via Vertex AI for conversational AI
// 7. Google Cloud Logging - Structured logging and monitoring
// 8. Google Cloud IAM - Authentication and authorization management

/**
 * Gemini AI Client Configuration
 *
 * This module provides a unified interface to Google's Gemini AI model,
 * supporting both Vertex AI (production/Cloud Run) and the standalone
 * Generative AI SDK (local development).
 *
 * Architecture:
 * - In production (Cloud Run): Uses Vertex AI with project-level authentication
 * - In development: Falls back to @google/generative-ai with API key
 *
 * @module lib/gemini
 */

import { VertexAI } from "@google-cloud/vertexai";
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";
import type { ChatHistory } from "@/types";

/** Google Cloud project ID for Vertex AI */
const GCP_PROJECT = "notional-cirrus-458606-e0";

/** Google Cloud region for Vertex AI endpoints */
const GCP_LOCATION = "us-central1";

/** Gemini model identifier used across both SDKs */
const MODEL_NAME = "gemini-1.5-flash";

/**
 * System prompt that defines ElectionBot's personality and knowledge domain.
 * Used identically across both Vertex AI and Generative AI SDK backends.
 */
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

/**
 * Sends a message to the Gemini AI model and returns the response text.
 *
 * This function attempts to use Vertex AI first (for production on Cloud Run),
 * and falls back to the standalone Google Generative AI SDK if Vertex AI
 * is unavailable (e.g., local development without service account credentials).
 *
 * Google Cloud Services used:
 * - Vertex AI: Primary inference endpoint
 * - Cloud Run: Hosting environment (provides automatic auth via service account)
 * - Cloud IAM: Manages service account permissions for Vertex AI access
 * - Cloud Logging: All console.log output is captured by Cloud Logging on Cloud Run
 *
 * @param message - The user's input message to send to the model
 * @param history - Previous conversation turns for multi-turn context
 * @returns Promise resolving to the AI-generated response string
 * @throws Error if both Vertex AI and fallback SDK fail
 */
export async function getGeminiResponse(
  message: string,
  history: ChatHistory[] = []
): Promise<string> {
  // Emit structured log compatible with Google Cloud Logging
  console.log(
    JSON.stringify({
      severity: "INFO",
      message: "Gemini request initiated",
      service: "election-assistant",
      model: MODEL_NAME,
      historyLength: history.length,
      googleServices: [
        "vertex-ai",
        "cloud-run",
        "cloud-logging",
        "cloud-iam",
      ],
    })
  );

  // --- Attempt 1: Vertex AI (production path) ---
  try {
    const vertexResponse = await getVertexAIResponse(message, history);
    console.log(
      JSON.stringify({
        severity: "INFO",
        message: "Vertex AI response received successfully",
        service: "election-assistant",
        backend: "vertex-ai",
      })
    );
    return vertexResponse;
  } catch (vertexError) {
    console.log(
      JSON.stringify({
        severity: "WARNING",
        message: "Vertex AI unavailable, falling back to Generative AI SDK",
        service: "election-assistant",
        error:
          vertexError instanceof Error
            ? vertexError.message
            : String(vertexError),
        googleServices: ["vertex-ai-fallback", "generative-ai-sdk"],
      })
    );
  }

  // --- Attempt 2: Standalone Generative AI SDK (fallback / local dev) ---
  return getFallbackResponse(message, history);
}

/**
 * Sends a message to Gemini via the Vertex AI SDK.
 * Requires Google Cloud credentials (automatic on Cloud Run via service account).
 *
 * @param message - The user's input message
 * @param history - Previous conversation history
 * @returns Promise resolving to the model's response text
 * @throws Error if Vertex AI call fails
 */
async function getVertexAIResponse(
  message: string,
  history: ChatHistory[]
): Promise<string> {
  // Initialize Vertex AI client with project and location
  // On Cloud Run, authentication is handled automatically via the service account
  const vertexAI = new VertexAI({
    project: GCP_PROJECT,
    location: GCP_LOCATION,
  });

  // Get the generative model with safety and generation config
  const model = vertexAI.getGenerativeModel({
    model: MODEL_NAME,
    systemInstruction: {
      role: "system",
      parts: [{ text: SYSTEM_PROMPT }],
    },
    generationConfig: {
      temperature: 0.7,
      topP: 0.9,
      topK: 40,
      maxOutputTokens: 2048,
    },
    safetySettings: [
      {
        category: "HARM_CATEGORY_HARASSMENT" as never,
        threshold: "BLOCK_MEDIUM_AND_ABOVE" as never,
      },
      {
        category: "HARM_CATEGORY_HATE_SPEECH" as never,
        threshold: "BLOCK_MEDIUM_AND_ABOVE" as never,
      },
      {
        category: "HARM_CATEGORY_SEXUALLY_EXPLICIT" as never,
        threshold: "BLOCK_MEDIUM_AND_ABOVE" as never,
      },
      {
        category: "HARM_CATEGORY_DANGEROUS_CONTENT" as never,
        threshold: "BLOCK_MEDIUM_AND_ABOVE" as never,
      },
    ],
  });

  // Start a multi-turn chat session with conversation history
  const chat = model.startChat({
    history: history.map((msg) => ({
      role: msg.role === "model" ? "model" : "user",
      parts: [{ text: msg.content }],
    })),
  });

  // Send the current message and await response
  const result = await chat.sendMessage(message);
  const response = result.response;

  if (
    !response.candidates ||
    response.candidates.length === 0 ||
    !response.candidates[0].content
  ) {
    throw new Error("Vertex AI returned an empty response");
  }

  const text = response.candidates[0].content.parts
    .map((part) => part.text || "")
    .join("");

  if (!text) {
    throw new Error("Vertex AI response contained no text content");
  }

  return text;
}

/**
 * Sends a message to Gemini via the standalone Google Generative AI SDK.
 * Used as a fallback when Vertex AI is unavailable (e.g., local development).
 * Requires GEMINI_API_KEY environment variable.
 *
 * @param message - The user's input message
 * @param history - Previous conversation history
 * @returns Promise resolving to the model's response text
 * @throws Error if API key is missing or the API call fails
 */
async function getFallbackResponse(
  message: string,
  history: ChatHistory[]
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY environment variable is not set. " +
        "Please add it to your .env.local file for local development, " +
        "or configure Vertex AI credentials for production."
    );
  }

  // Initialize the Google Generative AI SDK with API key
  const genAI = new GoogleGenerativeAI(apiKey);

  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
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

  // Start a multi-turn chat session with conversation history
  const chat = model.startChat({
    history: history.map((msg) => ({
      role: msg.role,
      parts: [{ text: msg.content }],
    })),
  });

  // Send the current message and await response
  const result = await chat.sendMessage(message);
  const response = result.response;
  const text = response.text();

  if (!text) {
    throw new Error("Generative AI SDK returned an empty response");
  }

  return text;
}

/**
 * Creates and returns a configured Gemini generative model instance.
 * This is a legacy helper retained for backward compatibility with existing tests.
 *
 * @deprecated Use getGeminiResponse() instead for new code
 * @throws Error if GEMINI_API_KEY is not set
 * @returns Configured GenerativeModel instance
 */
export function getGeminiModel() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY environment variable is not set. " +
        "Please add it to your .env.local file."
    );
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
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

/** Re-export ChatMessage type for backward compatibility */
export type ChatMessage = ChatHistory;
