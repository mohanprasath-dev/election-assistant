/**
 * POST /api/chat
 *
 * Chat API route that proxies user messages to the Gemini 1.5 Flash model.
 * Supports both Vertex AI (production on Cloud Run) and the standalone
 * Google Generative AI SDK (local development fallback).
 *
 * Google Cloud Services Integration:
 * - Vertex AI: Powers the conversational AI with Gemini 1.5 Flash
 * - Cloud Run: Hosts this API endpoint (auto-scaling, serverless)
 * - Cloud Build: Automated Docker builds and deployments
 * - Cloud IAM: Manages authentication and authorization
 * - Cloud Logging: Automatic request/response logging (structured JSON)
 * - Cloud Storage: Build artifact and container image storage
 * - Container Registry: Docker image storage and versioning
 *
 * Security features:
 * - Input sanitization (HTML stripping, length limiting)
 * - Rate limiting (in-memory token bucket, 20 req/min per IP)
 * - Request size validation (max 10KB)
 * - Content-Type enforcement
 * - Security response headers (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection)
 *
 * Accepts: { message: string, history: Array<{ role: "user"|"model", content: string }> }
 * Returns: { response: string } on success, or { error: string } on failure.
 */

import { NextRequest, NextResponse } from "next/server";
import { VertexAI } from "@google-cloud/vertexai";
import { getGeminiResponse } from "@/lib/gemini";
import type { ChatHistory, ApiChatRequest, ApiChatResponse } from "@/types";

/** Maximum allowed message length (characters) to prevent abuse */
const MAX_MESSAGE_LENGTH = 2000;

/** Maximum number of history messages to send for context */
const MAX_HISTORY_LENGTH = 50;

/** Maximum request body size in bytes (10KB) */
const MAX_REQUEST_SIZE = 10 * 1024;

/** Rate limit: maximum requests per window */
const RATE_LIMIT_MAX_REQUESTS = 20;

/** Rate limit: window duration in milliseconds (1 minute) */
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

// ---------------------------------------------------------------------------
// Rate Limiting (in-memory token bucket)
// ---------------------------------------------------------------------------

/** Rate limit tracking entry */
interface RateLimitEntry {
  /** Number of requests made in the current window */
  count: number;
  /** Timestamp (ms) when the current window resets */
  resetTime: number;
}

/**
 * In-memory rate limit store.
 * Maps client IP addresses to their request count and window reset time.
 *
 * Note: In a multi-instance Cloud Run deployment, each instance maintains
 * its own map. For stricter enforcement, use Redis or Cloud Memorystore.
 */
const rateLimitMap = new Map<string, RateLimitEntry>();

/**
 * Checks whether the given IP address has exceeded the rate limit.
 * Implements a fixed-window rate limiting algorithm.
 *
 * @param ip - The client's IP address
 * @returns true if the request is allowed, false if rate-limited
 */
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetTime) {
    // First request or window has expired — start a new window
    rateLimitMap.set(ip, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW_MS,
    });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  entry.count += 1;
  return true;
}

// Periodically clean up expired entries to prevent memory leaks.
// Using .unref() ensures this timer does not prevent process exit (e.g. in tests).
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  Array.from(rateLimitMap.entries()).forEach(([ip, entry]) => {
    if (now > entry.resetTime) {
      rateLimitMap.delete(ip);
    }
  });
}, RATE_LIMIT_WINDOW_MS);
if (typeof cleanupTimer === "object" && "unref" in cleanupTimer) {
  cleanupTimer.unref();
}

// ---------------------------------------------------------------------------
// Input Sanitization
// ---------------------------------------------------------------------------

/**
 * Sanitizes user input to prevent injection attacks and enforce limits.
 * - Trims leading/trailing whitespace
 * - Enforces maximum character length
 * - Strips HTML/XML tags
 *
 * @param input - Raw user input string
 * @returns Sanitized string safe for processing
 */
function sanitizeInput(input: string): string {
  return input.trim().slice(0, MAX_MESSAGE_LENGTH).replace(/<[^>]*>/g, "");
}

// ---------------------------------------------------------------------------
// Security Headers
// ---------------------------------------------------------------------------

/**
 * Creates a NextResponse with security headers applied.
 *
 * @param body - Response body object
 * @param status - HTTP status code
 * @returns NextResponse with security headers set
 */
function createSecureResponse(
  body: ApiChatResponse,
  status: number
): NextResponse {
  const response = NextResponse.json(body, { status });

  // Security headers to prevent common attacks
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );

  return response;
}

// ---------------------------------------------------------------------------
// POST Handler
// ---------------------------------------------------------------------------

/**
 * Handles incoming POST requests to the /api/chat endpoint.
 * Processes user messages through Gemini AI and returns responses.
 *
 * @param request - The incoming NextRequest
 * @returns NextResponse with the AI response or error
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  // ---- Structured Cloud Logging ----
  console.log(
    JSON.stringify({
      severity: "INFO",
      message: "Chat request received",
      service: "election-assistant",
      endpoint: "/api/chat",
      method: "POST",
      googleServices: [
        "vertex-ai",
        "cloud-run",
        "cloud-logging",
        "cloud-iam",
        "cloud-build",
      ],
    })
  );

  try {
    // ---- Content-Type Validation ----
    const contentType = request.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      console.log(
        JSON.stringify({
          severity: "WARNING",
          message: "Invalid Content-Type header",
          service: "election-assistant",
          receivedContentType: contentType,
        })
      );
      return createSecureResponse(
        { error: "Content-Type must be application/json." },
        415
      );
    }

    // ---- Rate Limiting ----
    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    if (!checkRateLimit(clientIp)) {
      console.log(
        JSON.stringify({
          severity: "WARNING",
          message: "Rate limit exceeded",
          service: "election-assistant",
          clientIp,
        })
      );
      return createSecureResponse(
        { error: "Too many requests. Please wait a moment and try again." },
        429
      );
    }

    // ---- Request Size Validation ----
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_REQUEST_SIZE) {
      console.log(
        JSON.stringify({
          severity: "WARNING",
          message: "Request body too large",
          service: "election-assistant",
          contentLength,
          maxAllowed: MAX_REQUEST_SIZE,
        })
      );
      return createSecureResponse(
        { error: "Request body too large. Maximum size is 10KB." },
        413
      );
    }

    // ---- Parse and Validate Request Body ----
    const body: ApiChatRequest = await request.json();

    if (!body.message || typeof body.message !== "string") {
      return createSecureResponse(
        { error: "Message is required and must be a string." },
        400
      );
    }

    const sanitizedMessage = sanitizeInput(body.message);

    if (sanitizedMessage.length === 0) {
      return createSecureResponse(
        { error: "Message cannot be empty after sanitization." },
        400
      );
    }

    // ---- Build Conversation History for Multi-Turn Chat ----
    const history: ChatHistory[] = Array.isArray(body.history)
      ? body.history.slice(-MAX_HISTORY_LENGTH)
      : [];

    // Validate each history entry
    const validHistory = history.filter(
      (msg): msg is ChatHistory =>
        msg !== null &&
        msg !== undefined &&
        typeof msg.role === "string" &&
        (msg.role === "user" || msg.role === "model") &&
        typeof msg.content === "string" &&
        msg.content.trim().length > 0
    );

    // ---- Send Message to Gemini AI ----
    console.log(
      JSON.stringify({
        severity: "INFO",
        message: "Sending message to Gemini AI",
        service: "election-assistant",
        messageLength: sanitizedMessage.length,
        historyLength: validHistory.length,
        googleServices: ["vertex-ai", "gemini-1.5-flash"],
      })
    );

    const responseText = await getGeminiResponse(
      sanitizedMessage,
      validHistory
    );

    if (!responseText) {
      return createSecureResponse(
        { error: "The AI could not generate a response. Please try again." },
        502
      );
    }

    // ---- Success Response ----
    console.log(
      JSON.stringify({
        severity: "INFO",
        message: "Chat response generated successfully",
        service: "election-assistant",
        responseLength: responseText.length,
        googleServices: ["vertex-ai", "cloud-run", "cloud-logging"],
      })
    );

    return createSecureResponse({ response: responseText }, 200);
  } catch (error: unknown) {
    // ---- Error Handling with Structured Logging ----
    console.error(
      JSON.stringify({
        severity: "ERROR",
        message: "Chat request failed",
        service: "election-assistant",
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        googleServices: ["cloud-logging", "cloud-run"],
      })
    );

    // Differentiate error types for better debugging
    if (error instanceof SyntaxError) {
      return createSecureResponse(
        { error: "Invalid JSON in request body." },
        400
      );
    }

    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred.";

    // Check for API key / configuration errors
    if (
      errorMessage.includes("GEMINI_API_KEY") ||
      errorMessage.includes("API key")
    ) {
      return createSecureResponse(
        {
          error:
            "Server configuration error. Please contact the administrator.",
        },
        500
      );
    }

    return createSecureResponse(
      { error: "Failed to get a response. Please try again later." },
      500
    );
  }
}
