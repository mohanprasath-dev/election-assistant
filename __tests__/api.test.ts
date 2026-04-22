/**
 * __tests__/api.test.ts
 *
 * Unit tests for the /api/chat POST endpoint.
 * Mocks the Gemini API SDK to avoid real API calls during CI.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// ---- Mock the @google/generative-ai SDK before any imports ----
const mockSendMessage = jest.fn();
const mockStartChat = jest.fn(() => ({
  sendMessage: mockSendMessage,
}));
const mockGetGenerativeModel = jest.fn(() => ({
  startChat: mockStartChat,
}));

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

/** Helper to create a mock NextRequest with JSON body */
function createMockRequest(body: Record<string, any>): NextRequest {
  return new NextRequest("http://localhost:3000/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/chat", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default: Gemini returns a successful response
    mockSendMessage.mockResolvedValue({
      response: {
        text: () =>
          "To register to vote in India, follow these steps:\n1. Visit the National Voters' Service Portal\n2. Fill out Form 6\n3. Submit required documents",
      },
    });
  });

  it("should return 200 with a valid response for a well-formed request", async () => {
    const req = createMockRequest({
      message: "How do I register to vote?",
      history: [],
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.response).toBeDefined();
    expect(typeof data.response).toBe("string");
    expect(data.response).toContain("register");
    expect(mockSendMessage).toHaveBeenCalledWith("How do I register to vote?");
  });

  it("should return 400 when message is missing", async () => {
    const req = createMockRequest({ history: [] });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBeDefined();
  });

  it("should return 400 when message is an empty string", async () => {
    const req = createMockRequest({ message: "   ", history: [] });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("empty");
  });

  it("should sanitize HTML tags from user input", async () => {
    const req = createMockRequest({
      message: '<script>alert("xss")</script>How do I vote?',
      history: [],
    });

    await POST(req);

    expect(mockSendMessage).toHaveBeenCalledWith(
      'alert("xss")How do I vote?'
    );
  });

  it("should pass conversation history to the Gemini chat session", async () => {
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

  it("should return 500 when the Gemini API throws an error", async () => {
    mockSendMessage.mockRejectedValue(new Error("API quota exceeded"));

    const req = createMockRequest({
      message: "What is NOTA?",
      history: [],
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBeDefined();
  });

  it("should handle missing history gracefully", async () => {
    const req = createMockRequest({
      message: "Explain EVM",
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockStartChat).toHaveBeenCalledWith({ history: [] });
  });
});
