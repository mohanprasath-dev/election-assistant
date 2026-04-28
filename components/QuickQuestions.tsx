"use client";

import React, { useCallback } from "react";
import type { QuickQuestion, QuickQuestionsProps } from "@/types";

/** Quick-tap suggestion chip data */
const QUICK_QUESTIONS: QuickQuestion[] = [
  { id: "register", label: "How do I register to vote?", query: "How do I register to vote?", icon: "📝" },
  { id: "evm", label: "How does EVM work?", query: "How does EVM work?", icon: "🖥️" },
  { id: "mcc", label: "What is Model Code of Conduct?", query: "What is Model Code of Conduct?", icon: "📜" },
  { id: "counting", label: "How are votes counted?", query: "How are votes counted?", icon: "🔢" },
  { id: "nota", label: "What is NOTA?", query: "What is NOTA?", icon: "❌" },
  { id: "elections", label: "Lok Sabha vs State Elections?", query: "Lok Sabha vs State Elections?", icon: "🏛️" },
];

/**
 * QuickQuestions — Grid of suggestion chips for common civic queries.
 * Wrapped with React.memo for performance (avoids re-renders when
 * only the chat state changes but the callback ref is stable).
 *
 * Accessibility: Each chip has aria-label, tabIndex, and keyboard Enter support.
 *
 * @param props - Component props with onQuestionClick callback
 */
const QuickQuestions = React.memo(function QuickQuestions({
  onQuestionClick,
}: QuickQuestionsProps) {
  /**
   * Handles chip click events. Wrapped in useCallback for stable reference.
   * @param query - The question to send to the chat
   */
  const handleChipClick = useCallback(
    (query: string) => {
      onQuestionClick(query);
    },
    [onQuestionClick]
  );

  /**
   * Handles keyboard events on chips. Triggers click on Enter or Space.
   * @param e - Keyboard event
   * @param query - The question to send on activation
   */
  const handleChipKeyDown = useCallback(
    (e: React.KeyboardEvent, query: string) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onQuestionClick(query);
      }
    },
    [onQuestionClick]
  );

  return (
    <section
      className="rounded-2xl border border-civic-200 bg-white/80 p-5 shadow-sm backdrop-blur-sm"
      aria-label="Quick questions"
    >
      <h2 className="font-heading mb-3 text-lg font-semibold text-indian-navy">
        💡 Quick Questions
      </h2>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="group" aria-label="Suggested questions">
        {QUICK_QUESTIONS.map((q) => (
          <button
            key={q.id}
            id={`quick-question-${q.id}`}
            aria-label={`Ask: ${q.label}`}
            tabIndex={0}
            onClick={() => handleChipClick(q.query)}
            onKeyDown={(e) => handleChipKeyDown(e, q.query)}
            className="group flex items-center gap-2.5 rounded-xl border border-civic-100 bg-civic-50/50
                       px-3.5 py-3 text-left text-sm font-medium text-civic-800
                       transition-all duration-200
                       hover:border-saffron-300 hover:bg-saffron-50 hover:shadow-sm
                       active:scale-[0.98]"
          >
            <span
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-white text-base shadow-sm
                         transition-transform duration-200 group-hover:scale-110"
              aria-hidden="true"
            >
              {q.icon}
            </span>
            <span className="leading-snug">{q.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
});

QuickQuestions.displayName = "QuickQuestions";
export default QuickQuestions;
