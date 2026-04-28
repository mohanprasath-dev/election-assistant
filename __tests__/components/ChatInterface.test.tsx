/**
 * __tests__/components/ChatInterface.test.tsx
 *
 * Component tests for the ChatInterface component.
 * Tests rendering, user interaction, accessibility, and API integration.
 *
 * Uses @testing-library/react for DOM queries and user-event for interaction.
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

// ---- Mock next/dynamic to return the actual component ----
jest.mock("next/dynamic", () => {
  return function mockDynamic(loader: () => Promise<any>) {
    // For react-markdown, return a simple passthrough
    const MockComponent = (props: any) => {
      return React.createElement("div", { "data-testid": "markdown" }, props.children);
    };
    MockComponent.displayName = "MockDynamic";
    return MockComponent;
  };
});

// ---- Mock fetch for API calls ----
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Import after mocks are set up
import ChatInterface from "@/components/ChatInterface";

describe("ChatInterface", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock scrollIntoView which doesn't exist in jsdom
    Element.prototype.scrollIntoView = jest.fn();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ response: "This is a test response from ElectionBot." }),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ---- Rendering ----

  it("should render the welcome message when no messages exist", () => {
    render(<ChatInterface />);

    expect(screen.getByText(/Hi! I'm ElectionBot/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Ask me anything about the election process/i)
    ).toBeInTheDocument();
  });

  it("should render the chat input field", () => {
    render(<ChatInterface />);

    const input = screen.getByRole("textbox", { name: /type your message/i });
    expect(input).toBeInTheDocument();
    expect(input).not.toBeDisabled();
  });

  it("should render the send button", () => {
    render(<ChatInterface />);

    const sendButton = screen.getByRole("button", { name: /send message/i });
    expect(sendButton).toBeInTheDocument();
  });

  // ---- User Interaction ----

  it("should accept text input", async () => {
    render(<ChatInterface />);

    const input = screen.getByRole("textbox", { name: /type your message/i });
    fireEvent.change(input, { target: { value: "How do I vote?" } });

    expect(input).toHaveValue("How do I vote?");
  });

  it("should disable send button when input is empty", () => {
    render(<ChatInterface />);

    const sendButton = screen.getByRole("button", { name: /send message/i });
    expect(sendButton).toBeDisabled();
  });

  it("should enable send button when input has text", () => {
    render(<ChatInterface />);

    const input = screen.getByRole("textbox", { name: /type your message/i });
    fireEvent.change(input, { target: { value: "Hello" } });

    const sendButton = screen.getByRole("button", { name: /send message/i });
    expect(sendButton).not.toBeDisabled();
  });

  it("should send message on send button click", async () => {
    render(<ChatInterface />);

    const input = screen.getByRole("textbox", { name: /type your message/i });
    fireEvent.change(input, { target: { value: "What is NOTA?" } });

    const sendButton = screen.getByRole("button", { name: /send message/i });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/chat", expect.objectContaining({
        method: "POST",
      }));
    });
  });

  it("should clear input after sending a message", async () => {
    render(<ChatInterface />);

    const input = screen.getByRole("textbox", { name: /type your message/i });
    fireEvent.change(input, { target: { value: "Test message" } });
    
    const sendButton = screen.getByRole("button", { name: /send message/i });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(input).toHaveValue("");
    });
  });

  // ---- External Messages (Quick Questions) ----

  it("should send external message when provided", async () => {
    const onConsumed = jest.fn();

    render(
      <ChatInterface
        externalMessage="How does EVM work?"
        onExternalMessageConsumed={onConsumed}
      />
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/chat", expect.objectContaining({
        method: "POST",
      }));
    });
  });

  // ---- Accessibility ----

  it("should have proper ARIA attributes on the message area", () => {
    render(<ChatInterface />);

    const messageArea = screen.getByRole("log");
    expect(messageArea).toHaveAttribute("aria-live", "polite");
    expect(messageArea).toHaveAttribute("aria-label", "Chat messages");
  });

  it("should have aria-describedby on the input", () => {
    render(<ChatInterface />);

    const input = screen.getByRole("textbox", { name: /type your message/i });
    expect(input).toHaveAttribute("aria-describedby", "chat-input-desc");
  });

  it("should have a screen-reader-only input description", () => {
    render(<ChatInterface />);

    const desc = document.getElementById("chat-input-desc");
    expect(desc).toBeInTheDocument();
    expect(desc?.textContent).toContain("Type your election question here");
  });
});
