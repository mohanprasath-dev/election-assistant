"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";

/** Single chat message with metadata */
interface Message {
  id: string;
  role: "user" | "model";
  content: string;
  timestamp: Date;
}

/** History entry sent to the API (without extra UI metadata) */
interface HistoryEntry {
  role: "user" | "model";
  content: string;
}

interface ChatInterfaceProps {
  /** Externally injected message (from QuickQuestions chip click) */
  externalMessage?: string | null;
  /** Callback to clear the external message after it's been consumed */
  onExternalMessageConsumed?: () => void;
}

/**
 * ChatInterface — Full chat UI with Gemini-powered responses.
 *
 * Features:
 * - User / bot message bubbles with timestamps
 * - Typing indicator (animated 3 dots)
 * - Auto-scroll to latest message
 * - Markdown rendering for bot responses
 * - Clear chat, Enter-to-send, external message injection
 */
export default function ChatInterface({
  externalMessage,
  onExternalMessageConsumed,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /** Generate a unique ID for each message */
  const generateId = () =>
    `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  /** Scroll to the bottom of the chat */
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  /**
   * Send a message to the chat API and append the response.
   * Uses useCallback for stable reference (passed to memoized children).
   */
  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;

      // Append user message
      const userMsg: Message = {
        id: generateId(),
        role: "user",
        content: trimmed,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInputValue("");
      setIsLoading(true);

      try {
        // Build history from existing messages
        const history: HistoryEntry[] = messages.map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: trimmed, history }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to get response");
        }

        const botMsg: Message = {
          id: generateId(),
          role: "model",
          content: data.response,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, botMsg]);
      } catch (error) {
        const errorMsg: Message = {
          id: generateId(),
          role: "model",
          content:
            "I'm sorry, I couldn't process your request right now. Please try again in a moment. 🙏",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMsg]);
        console.error("Chat error:", error);
      } finally {
        setIsLoading(false);
        inputRef.current?.focus();
      }
    },
    [isLoading, messages]
  );

  /** Handle external messages injected from QuickQuestions */
  useEffect(() => {
    if (externalMessage) {
      sendMessage(externalMessage);
      onExternalMessageConsumed?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalMessage]);

  /** Handle keyboard submit */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage(inputValue);
      }
    },
    [sendMessage, inputValue]
  );

  /** Clear all chat messages */
  const handleClearChat = useCallback(() => {
    setMessages([]);
    setInputValue("");
    inputRef.current?.focus();
  }, []);

  /** Format timestamp for display */
  const formatTime = (date: Date): string =>
    date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const hasMessages = messages.length > 0;

  return (
    <section
      className="flex h-[600px] flex-col rounded-2xl border border-civic-200 bg-white/90 shadow-sm backdrop-blur-sm lg:h-[calc(100vh-140px)]"
      aria-label="Chat with ElectionBot"
    >
      {/* Chat header bar */}
      <div className="flex items-center justify-between border-b border-civic-100 px-5 py-3">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-indian-green" aria-hidden="true" />
          <span className="text-sm font-semibold text-civic-800">
            ElectionBot is online
          </span>
        </div>
        {hasMessages && (
          <button
            onClick={handleClearChat}
            aria-label="Clear chat history"
            className="rounded-lg px-3 py-1 text-xs font-medium text-civic-500 transition-colors
                       hover:bg-red-50 hover:text-red-600"
          >
            Clear Chat
          </button>
        )}
      </div>

      {/* Messages area */}
      <div
        className="flex-1 overflow-y-auto px-4 py-4"
        role="log"
        aria-live="polite"
        aria-label="Chat messages"
        id="chat-messages"
      >
        {/* Empty state / welcome */}
        {!hasMessages && !isLoading && (
          <div className="flex h-full flex-col items-center justify-center text-center animate-fade-in">
            <div className="mb-4 text-6xl">🗳️</div>
            <h3 className="font-heading mb-2 text-xl font-bold text-indian-navy">
              Hi! I&apos;m ElectionBot
            </h3>
            <p className="max-w-sm text-sm text-civic-600">
              Ask me anything about the election process — voter registration,
              EVMs, vote counting, NOTA, and more!
            </p>
          </div>
        )}

        {/* Message bubbles */}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`mb-3 flex chat-bubble-enter ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`relative max-w-[85%] rounded-2xl px-4 py-2.5 sm:max-w-[75%] ${
                msg.role === "user"
                  ? "rounded-br-md bg-indian-navy text-white"
                  : "rounded-bl-md border border-civic-100 bg-civic-50 text-civic-900"
              }`}
            >
              {/* Message content */}
              {msg.role === "model" ? (
                <div className="markdown-body text-sm leading-relaxed">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm leading-relaxed">{msg.content}</p>
              )}

              {/* Timestamp */}
              <span
                className={`mt-1 block text-[10px] ${
                  msg.role === "user"
                    ? "text-indigo-200"
                    : "text-civic-400"
                }`}
                aria-label={`Sent at ${formatTime(msg.timestamp)}`}
              >
                {formatTime(msg.timestamp)}
              </span>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isLoading && (
          <div className="mb-3 flex justify-start chat-bubble-enter">
            <div className="rounded-2xl rounded-bl-md border border-civic-100 bg-civic-50 px-5 py-3">
              <div className="flex items-center gap-1.5" aria-label="ElectionBot is typing">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-civic-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about elections, voting, EVMs..."
            disabled={isLoading}
            aria-label="Type your message to ElectionBot"
            aria-describedby="chat-input-hint"
            id="chat-input"
            className="flex-1 rounded-xl border border-civic-200 bg-civic-50/50 px-4 py-2.5 text-sm
                       text-civic-900 placeholder:text-civic-400
                       transition-all focus:border-saffron-400 focus:bg-white
                       focus:ring-2 focus:ring-saffron-100
                       disabled:opacity-50"
          />
          <button
            onClick={() => sendMessage(inputValue)}
            disabled={isLoading || !inputValue.trim()}
            aria-label="Send message"
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl
                       bg-indian-navy text-white shadow-md shadow-indian-navy/20
                       transition-all hover:bg-civic-800 hover:shadow-lg
                       active:scale-95 disabled:opacity-40 disabled:shadow-none"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path d="M3.478 2.404a.75.75 0 00-.926.941l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.404z" />
            </svg>
          </button>
        </div>
        <p id="chat-input-hint" className="sr-only">
          Press Enter to send your message, or click the Send button.
        </p>
      </div>
    </section>
  );
}
