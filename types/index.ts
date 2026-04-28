/**
 * Centralized TypeScript type definitions for the Election Assistant application.
 *
 * All shared interfaces are exported from this module to ensure consistency
 * across components, API routes, and utility functions.
 *
 * @module types
 */

/**
 * Represents a single chat message displayed in the UI.
 * Contains metadata (id, timestamp) for rendering and keying.
 */
export interface Message {
  /** Unique identifier for React key and deduplication */
  id: string;
  /** Who sent the message — 'user' for the human, 'assistant' for ElectionBot */
  role: "user" | "assistant";
  /** The text content of the message (may contain Markdown for assistant messages) */
  content: string;
  /** When the message was created (used for timestamp display) */
  timestamp: Date;
}

/**
 * Conversation history entry sent to the Gemini API.
 * Uses 'model' role as required by the Gemini SDK.
 */
export interface ChatHistory {
  /** 'user' for human messages, 'model' for AI responses */
  role: "user" | "model";
  /** Plain-text content of the message */
  content: string;
}

/**
 * A single step in the election process timeline.
 * Used by ElectionTimeline to render interactive step cards.
 */
export interface TimelineStep {
  /** Numeric identifier and display order (1-based) */
  id: number;
  /** Emoji icon representing this step */
  icon: string;
  /** Short title for the step */
  title: string;
  /** Brief one-line summary shown on the step card */
  description: string;
  /** Extended details shown when the step is expanded/selected */
  details: string;
}

/**
 * Request body shape for the POST /api/chat endpoint.
 */
export interface ApiChatRequest {
  /** The user's input message */
  message: string;
  /** Previous conversation turns for context */
  history: ChatHistory[];
}

/**
 * Response body shape from the POST /api/chat endpoint.
 */
export interface ApiChatResponse {
  /** The AI-generated response text (present on success) */
  response?: string;
  /** Error description (present on failure) */
  error?: string;
}

/**
 * Quick question chip data for the QuickQuestions component.
 */
export interface QuickQuestion {
  /** Unique identifier for the chip */
  id: string;
  /** Display label text */
  label: string;
  /** Full query string sent to the chat API */
  query: string;
  /** Emoji icon for the chip */
  icon: string;
}

/**
 * Props for the ChatInterface component.
 */
export interface ChatInterfaceProps {
  /** Externally injected message (e.g. from QuickQuestions chip click) */
  externalMessage?: string | null;
  /** Callback to clear the external message after it has been consumed */
  onExternalMessageConsumed?: () => void;
}

/**
 * Props for the QuickQuestions component.
 */
export interface QuickQuestionsProps {
  /** Callback invoked when a suggestion chip is clicked */
  onQuestionClick: (question: string) => void;
}

/**
 * Props for the ErrorBoundary component.
 */
export interface ErrorBoundaryProps {
  /** Child elements to render inside the boundary */
  children: React.ReactNode;
  /** Optional custom fallback UI */
  fallback?: React.ReactNode;
}

/**
 * State for the ErrorBoundary component.
 */
export interface ErrorBoundaryState {
  /** Whether an error has been caught */
  hasError: boolean;
  /** The caught error object, if any */
  error: Error | null;
}
