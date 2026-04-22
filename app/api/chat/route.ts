/**
 * POST /api/chat
 *
 * Chat API route that proxies user messages to the Gemini 1.5 Flash model
 * (Google Generative AI — the AI backbone of this application).
 *
 * Accepts: { message: string, history: Array<{ role: "user"|"model", content: string }> }
 * Returns: { response: string } on success, or { error: string } on failure.
 *
 * Security considerations:
 * - API key is read exclusively from environment variables (never exposed to client)
 * - Input is sanitized (trimmed, length-limited)
 * - TODO: Add rate limiting via middleware (e.g., upstash/ratelimit or
 *   Cloud Run concurrency limits) for production deployment
 */

import { NextRequest, NextResponse } from "next/server";
import { getGeminiModel, type ChatMessage } from "@/lib/gemini";

/** Maximum allowed message length (characters) to prevent abuse */
const MAX_MESSAGE_LENGTH = 4000;

/** Maximum number of history messages to send for context */
const MAX_HISTORY_LENGTH = 50;

/** Request body type expected by this endpoint */
interface ChatRequestBody {
  message: string;
  history?: ChatMessage[];
}

/**
 * Sanitize user input: trim whitespace, enforce length limit,
 * and strip any HTML-like tags to prevent injection.
 */
function sanitizeInput(input: string): string {
  return input
    .trim()
    .slice(0, MAX_MESSAGE_LENGTH)
    .replace(/<[^>]*>/g, "");
}

export async function POST(request: NextRequest) {
  try {
    // ---- Parse and validate request body ----
    const body: ChatRequestBody = await request.json();

    if (!body.message || typeof body.message !== "string") {
      return NextResponse.json(
        { error: "Message is required and must be a string." },
        { status: 400 }
      );
    }

    const sanitizedMessage = sanitizeInput(body.message);

    if (sanitizedMessage.length === 0) {
      return NextResponse.json(
        { error: "Message cannot be empty after sanitization." },
        { status: 400 }
      );
    }

    // ---- Build conversation history for multi-turn chat ----
    const history: ChatMessage[] = Array.isArray(body.history)
      ? body.history.slice(-MAX_HISTORY_LENGTH)
      : [];

    // Validate each history entry
    const validHistory = history.filter(
      (msg) =>
        msg &&
        typeof msg.role === "string" &&
        (msg.role === "user" || msg.role === "model") &&
        typeof msg.content === "string" &&
        msg.content.trim().length > 0
    );

    // ---- Initialize Gemini model and start chat session ----
    const model = getGeminiModel();

    const chat = model.startChat({
      history: validHistory.map((msg) => ({
        role: msg.role,
        parts: [{ text: msg.content }],
      })),
    });

    // ---- Send message and get response from Gemini API ----
    const result = await chat.sendMessage(sanitizedMessage);
    const response = result.response;
    const text = response.text();

    if (!text) {
      return NextResponse.json(
        { error: "The AI could not generate a response. Please try again." },
        { status: 502 }
      );
    }

    return NextResponse.json({ response: text }, { status: 200 });
  } catch (error: unknown) {
    console.error("[/api/chat] Error:", error);

    // ---- Differentiate error types for better debugging ----
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid JSON in request body." },
        { status: 400 }
      );
    }

    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred.";

    // Check for API key errors
    if (errorMessage.includes("GEMINI_API_KEY")) {
      return NextResponse.json(
        { error: "Server configuration error. Please contact the administrator." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Failed to get a response. Please try again later." },
      { status: 500 }
    );
  }
}
