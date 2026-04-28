"use client";

import React, { useState, useCallback, Suspense } from "react";
import dynamic from "next/dynamic";
import Header from "@/components/Header";
import ErrorBoundary from "@/components/ErrorBoundary";

/**
 * Dynamically imported components for code-splitting and performance.
 * Heavy components are loaded on demand to reduce initial bundle size.
 *
 * - ElectionTimeline: Contains timeline data + animation logic
 * - ChatInterface: Contains Markdown renderer + chat state management
 */
const ElectionTimeline = dynamic(
  () => import("@/components/ElectionTimeline"),
  {
    loading: () => (
      <div
        className="flex h-64 items-center justify-center rounded-2xl border border-civic-200 bg-white/80"
        role="status"
        aria-label="Loading timeline"
      >
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-civic-300 border-t-saffron-500" />
          <span className="text-sm text-civic-500">Loading timeline…</span>
        </div>
      </div>
    ),
    ssr: false,
  }
);

const ChatInterface = dynamic(() => import("@/components/ChatInterface"), {
  loading: () => (
    <div
      className="flex h-[600px] items-center justify-center rounded-2xl border border-civic-200 bg-white/90 lg:h-[calc(100vh-140px)]"
      role="status"
      aria-label="Loading chat"
    >
      <div className="flex flex-col items-center gap-2">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-civic-300 border-t-indian-navy" />
        <span className="text-sm text-civic-500">Loading chat…</span>
      </div>
    </div>
  ),
  ssr: false,
});

const QuickQuestions = dynamic(() => import("@/components/QuickQuestions"), {
  loading: () => (
    <div
      className="flex h-40 items-center justify-center rounded-2xl border border-civic-200 bg-white/80"
      role="status"
      aria-label="Loading quick questions"
    >
      <div className="flex flex-col items-center gap-2">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-civic-300 border-t-indian-green" />
        <span className="text-sm text-civic-500">Loading questions…</span>
      </div>
    </div>
  ),
  ssr: false,
});

/**
 * Home page — Assembles the full ElectionBot layout.
 *
 * Desktop: Two-column grid (Timeline + Quick Questions on left, Chat on right).
 * Mobile: Single-column stack (Header → Timeline → Quick Questions → Chat).
 *
 * Performance optimizations:
 * - Dynamic imports for all heavy components (code-splitting)
 * - Suspense boundaries with loading fallbacks
 * - useCallback for stable handler references
 * - ErrorBoundary for graceful error recovery
 */
export default function HomePage() {
  const [externalMessage, setExternalMessage] = useState<string | null>(null);

  /** Stable callback for QuickQuestions chip clicks */
  const handleQuestionClick = useCallback((question: string) => {
    setExternalMessage(question);
  }, []);

  /** Clear external message after ChatInterface has consumed it */
  const handleExternalMessageConsumed = useCallback(() => {
    setExternalMessage(null);
  }, []);

  return (
    <div className="civic-pattern min-h-screen">
      <Header />

      <main
        id="main-content"
        className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8"
        role="main"
      >
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* Left column: Timeline + Quick Questions */}
          <div className="flex flex-col gap-6 lg:col-span-2">
            <Suspense
              fallback={
                <div className="h-64 animate-pulse rounded-2xl bg-civic-100" />
              }
            >
              <ElectionTimeline />
            </Suspense>

            <Suspense
              fallback={
                <div className="h-40 animate-pulse rounded-2xl bg-civic-100" />
              }
            >
              <QuickQuestions onQuestionClick={handleQuestionClick} />
            </Suspense>
          </div>

          {/* Right column: Chat */}
          <div className="lg:col-span-3">
            <ErrorBoundary>
              <Suspense
                fallback={
                  <div className="h-[600px] animate-pulse rounded-2xl bg-civic-100 lg:h-[calc(100vh-140px)]" />
                }
              >
                <ChatInterface
                  externalMessage={externalMessage}
                  onExternalMessageConsumed={handleExternalMessageConsumed}
                />
              </Suspense>
            </ErrorBoundary>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer
        className="mt-8 border-t border-civic-100 py-4 text-center text-xs text-civic-500"
        role="contentinfo"
      >
        <p>
          Built with ❤️ for civic education &middot; Powered by{" "}
          <span className="font-semibold text-civic-700">
            Google Gemini AI via Vertex AI
          </span>
        </p>
      </footer>
    </div>
  );
}
