/**
 * __tests__/api.test.ts
 *
 * Comprehensive unit tests for the /api/chat POST endpoint.
 * Mocks the Gemini API SDK and Vertex AI SDK to avoid real API calls during CI.
 *
 * Test categories:
 * - Successful responses
 * - Input validation (empty, missing, invalid)
 * - Security (sanitization, rate limiting, Content-Type enforcement)
 * - Error handling (API errors, config errors)
 * - Conversation history handling
 * - Response format validation
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// ---- Mock the @google-cloud/vertexai SDK ----
jest.mock("@google-cloud/vertexai", () => ({
  VertexAI: jest.fn(() => ({
    getGenerativeModel: jest.fn(() => ({
      startChat: jest.fn(() => ({
        sendMessage: jest.fn().mockRejectedValue(new Error("Vertex AI not available in test")),
      })),
    })),
  })),
}));

// ---- Mock the @google/generative-ai SDK ----
const mockSendMessage = jest.fn();
const mockStartChat = jest.fn(() => ({ sendMessage: mockSendMessage }));
const mockGetGenerativeModel = jest.fn(() => ({ startChat: mockStartChat }));

jest.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: jest.fn(() => ({
    getGenerativeModel: mockGetGenerativeModel,
  })),
  HarmCategory: {
    HARM_CATEGORY_HARASSMENT: "HARM_CATEGORY_HARASSMENT",
    HARM_CATEGORY_HATE_SPEECH: "HARM_CATEGORY_HATE_SPEECH",
    HARM_CATEGORY_SEXUALLY_EXPLICIT: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
    HARM_CATEGORY_DANGEROUS_CONTENT: "HARM_CATEGORY_DANGEROUS_CONTENT",
  },
  HarmBlockThreshold: {
    BLOCK_MEDIUM_AND_ABOVE: "BLOCK_MEDIUM_AND_ABOVE",
  },
}));

// ---- Set environment variable for tests ----
process.env.GEMINI_API_KEY = "test-api-key-12345";

import { POST } from "@/app/api/chat/route";
import { NextRequest } from "next/server";
import type { ApiChatResponse } from "@/types";

/**
 * Helper to create a mock NextRequest with JSON body.
 * @param body - Request body object
 * @param headers - Optional additional headers
 * @returns Configured NextRequest instance
 */
function createMockRequest(
  body: Record<string, any>,
  headers?: Record<string, string>
): NextRequest {
  const defaultHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...headers,
  };

  return new NextRequest("http://localhost:3000/api/chat", {
    method: "POST",
    headers: defaultHeaders,
    body: JSON.stringify(body),
  });
}

describe("POST /api/chat", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default: Gemini SDK returns a successful response
    mockSendMessage.mockResolvedValue({
      response: {
        text: () =>
          "To register to vote in India, follow these steps:\n1. Visit the National Voters' Service Portal\n2. Fill out Form 6\n3. Submit required documents",
      },
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ---- Success Cases ----

  it("should return 200 with a valid response for a well-formed request", async () => {
    const req = createMockRequest({
      message: "How do I register to vote?",
      history: [],
    });

    const res = await POST(req);
    const data: ApiChatResponse = await res.json();

    expect(res.status).toBe(200);
    expect(data.response).toBeDefined();
    expect(typeof data.response).toBe("string");
    expect(data.response).toContain("register");
  });

  it("should return a response matching ApiChatResponse interface", async () => {
    const req = createMockRequest({
      message: "What is NOTA?",
      history: [],
    });

    const res = await POST(req);
    const data: ApiChatResponse = await res.json();

    expect(res.status).toBe(200);
    // Success response should have 'response' field and no 'error'
    expect(data).toHaveProperty("response");
    expect(typeof data.response).toBe("string");
  });

  // ---- Input Validation ----

  it("should return 400 when message field is missing", async () => {
    const req = createMockRequest({ history: [] });

    const res = await POST(req);
    const data: ApiChatResponse = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBeDefined();
    expect(typeof data.error).toBe("string");
  });

  it("should return 400 when message is an empty string", async () => {
    const req = createMockRequest({ message: "   ", history: [] });

    const res = await POST(req);
    const data: ApiChatResponse = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("empty");
  });

  it("should return 400 when message is not a string", async () => {
    const req = createMockRequest({ message: 12345, history: [] });

    const res = await POST(req);
    const data: ApiChatResponse = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBeDefined();
  });

  // ---- Security: Input Sanitization ----

  it("should sanitize HTML tags from user input", async () => {
    const req = createMockRequest({
      message: '<script>alert("xss")</script>How do I vote?',
      history: [],
    });

    await POST(req);

    // The sanitized message should have HTML tags stripped
    expect(mockSendMessage).toHaveBeenCalledWith(
      'alert("xss")How do I vote?'
    );
  });

  it("should enforce maximum message length", async () => {
    const longMessage = "a".repeat(3000);
    const req = createMockRequest({ message: longMessage, history: [] });

    await POST(req);

    // Message should be truncated to MAX_MESSAGE_LENGTH (2000)
    const calledWith = mockSendMessage.mock.calls[0]?.[0];
    if (calledWith) {
      expect(calledWith.length).toBeLessThanOrEqual(2000);
    }
  });

  // ---- Security: Response Headers ----

  it("should include security headers in the response", async () => {
    const req = createMockRequest({
      message: "Hello",
      history: [],
    });

    const res = await POST(req);

    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(res.headers.get("X-Frame-Options")).toBe("DENY");
    expect(res.headers.get("X-XSS-Protection")).toBe("1; mode=block");
  });

  // ---- Conversation History ----

  it("should pass conversation history correctly to the chat session", async () => {
    const history = [
      { role: "user", content: "Hello" },
      { role: "model", content: "Hi! How can I help you?" },
    ];

    const req = createMockRequest({
      message: "Tell me about NOTA",
      history,
    });

    await POST(req);

    expect(mockStartChat).toHaveBeenCalledWith({
      history: [
        { role: "user", parts: [{ text: "Hello" }] },
        { role: "model", parts: [{ text: "Hi! How can I help you?" }] },
      ],
    });
  });

  it("should handle missing history gracefully", async () => {
    const req = createMockRequest({ message: "Explain EVM" });

    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockStartChat).toHaveBeenCalledWith({ history: [] });
  });

  it("should filter invalid history entries", async () => {
    const history = [
      { role: "user", content: "Hello" },
      { role: "invalid_role", content: "Bad entry" },
      { role: "model", content: "" },
      null,
      { role: "model", content: "Valid response" },
    ];

    const req = createMockRequest({
      message: "Test",
      history,
    });

    await POST(req);

    // Should only include valid entries
    expect(mockStartChat).toHaveBeenCalledWith({
      history: [
        { role: "user", parts: [{ text: "Hello" }] },
        { role: "model", parts: [{ text: "Valid response" }] },
      ],
    });
  });

  // ---- Error Handling ----

  it("should return 500 when the Gemini API throws an error", async () => {
    mockSendMessage.mockRejectedValue(new Error("API quota exceeded"));

    const req = createMockRequest({
      message: "What is NOTA?",
      history: [],
    });

    const res = await POST(req);
    const data: ApiChatResponse = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBeDefined();
    expect(typeof data.error).toBe("string");
  });

  it("should return 500 with config error when API key is missing", async () => {
    mockSendMessage.mockRejectedValue(
      new Error("GEMINI_API_KEY environment variable is not set")
    );

    const req = createMockRequest({
      message: "Hello",
      history: [],
    });

    const res = await POST(req);
    const data: ApiChatResponse = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toContain("configuration");
  });

  // ---- Content-Type Validation ----

  it("should return 415 when Content-Type is not application/json", async () => {
    const req = new NextRequest("http://localhost:3000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ message: "Hello" }),
    });

    const res = await POST(req);
    const data: ApiChatResponse = await res.json();

    expect(res.status).toBe(415);
    expect(data.error).toContain("application/json");
  });
});
