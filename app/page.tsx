"use client";

import React, { useState, useCallback } from "react";
import Header from "@/components/Header";
import ElectionTimeline from "@/components/ElectionTimeline";
import QuickQuestions from "@/components/QuickQuestions";
import ChatInterface from "@/components/ChatInterface";

/**
 * Home page — Assembles the full ElectionBot layout.
 *
 * Desktop: Two-column grid (Timeline + Quick Questions on left, Chat on right).
 * Mobile: Single-column stack (Header → Timeline → Quick Questions → Chat).
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

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* Left column: Timeline + Quick Questions */}
          <div className="flex flex-col gap-6 lg:col-span-2">
            <ElectionTimeline />
            <QuickQuestions onQuestionClick={handleQuestionClick} />
          </div>

          {/* Right column: Chat */}
          <div className="lg:col-span-3">
            <ChatInterface
              externalMessage={externalMessage}
              onExternalMessageConsumed={handleExternalMessageConsumed}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-8 border-t border-civic-100 py-4 text-center text-xs text-civic-500">
        <p>
          Built with ❤️ for civic education &middot; Powered by{" "}
          <span className="font-semibold text-civic-700">Google Gemini AI</span>
        </p>
      </footer>
    </div>
  );
}
