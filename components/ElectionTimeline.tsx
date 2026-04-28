"use client";

import React, { useState, useCallback, useMemo } from "react";
import type { TimelineStep } from "@/types";

/**
 * Memoized timeline steps data.
 * Defined outside the component to prevent re-creation on each render.
 */
const TIMELINE_STEPS: TimelineStep[] = [
  {
    id: 1,
    icon: "🔔",
    title: "Election Announcement",
    description: "ECI announces election schedule and key dates.",
    details:
      "The Election Commission of India (ECI) announces the election schedule, including key dates for nominations, campaigning, polling, and results. A Model Code of Conduct comes into effect immediately from this date.",
  },
  {
    id: 2,
    icon: "📋",
    title: "Voter Registration Check",
    description: "Citizens verify their name on the electoral roll.",
    details:
      "Citizens verify their name on the electoral roll via the ECI website or Voter Helpline app. New voters can register using Form 6. Corrections are made using Form 8. Photo voter slips (EPIC) are issued.",
  },
  {
    id: 3,
    icon: "🏃",
    title: "Campaign Period",
    description: "Political parties campaign across constituencies.",
    details:
      "Political parties and candidates campaign across constituencies. Campaigning must stop 48 hours before polling begins. All campaign spending is tracked and monitored by the ECI to ensure fair elections.",
  },
  {
    id: 4,
    icon: "🗳️",
    title: "Voting Day",
    description: "Voters visit polling booths and cast their vote.",
    details:
      "Voters visit their designated polling booth with a valid ID. After verification, they use the EVM (Electronic Voting Machine) to cast their vote in secret. Indelible ink is applied to prevent duplicate voting.",
  },
  {
    id: 5,
    icon: "📊",
    title: "Vote Counting",
    description: "EVMs are opened at counting centres under supervision.",
    details:
      "EVMs are securely stored and later opened at counting centres under strict supervision. VVPAT (Voter Verifiable Paper Audit Trail) slips from randomly selected booths are cross-verified with EVM results.",
  },
  {
    id: 6,
    icon: "🏆",
    title: "Results & Oath",
    description: "Results declared and government is formed.",
    details:
      "Results are declared constituency by constituency. The party or coalition with a majority is invited to form the government. Elected representatives take an oath of office and begin their term.",
  },
];

/**
 * ElectionTimeline — A visual horizontal/vertical timeline showing
 * the 6 major steps of the Indian election process.
 * Each step is clickable and reveals a description panel.
 *
 * Performance: Wrapped with React.memo, uses useCallback for click handlers
 * and useMemo for derived data.
 *
 * Accessibility: Full keyboard navigation with arrow keys, ARIA roles
 * (list/listitem), aria-current, and aria-expanded.
 */
const ElectionTimeline = React.memo(function ElectionTimeline() {
  const [activeStep, setActiveStep] = useState<number>(1);

  /** Memoized active step data lookup */
  const activeData = useMemo(
    () => TIMELINE_STEPS.find((s) => s.id === activeStep)!,
    [activeStep]
  );

  /** Stable click handler for step buttons */
  const handleStepClick = useCallback((stepId: number) => {
    setActiveStep(stepId);
  }, []);

  /**
   * Keyboard navigation handler for timeline steps.
   * Arrow keys move between steps, Home/End jump to first/last.
   */
  const handleStepKeyDown = useCallback(
    (e: React.KeyboardEvent, currentId: number) => {
      let nextId: number | null = null;

      switch (e.key) {
        case "ArrowRight":
        case "ArrowDown":
          e.preventDefault();
          nextId = currentId < TIMELINE_STEPS.length ? currentId + 1 : 1;
          break;
        case "ArrowLeft":
        case "ArrowUp":
          e.preventDefault();
          nextId = currentId > 1 ? currentId - 1 : TIMELINE_STEPS.length;
          break;
        case "Home":
          e.preventDefault();
          nextId = 1;
          break;
        case "End":
          e.preventDefault();
          nextId = TIMELINE_STEPS.length;
          break;
      }

      if (nextId !== null) {
        setActiveStep(nextId);
        // Focus the target button
        const targetButton = document.getElementById(`timeline-step-${nextId}`);
        targetButton?.focus();
      }
    },
    []
  );

  /** Memoized rendered step buttons */
  const renderedSteps = useMemo(
    () =>
      TIMELINE_STEPS.map((step) => {
        const isActive = step.id === activeStep;
        const isPast = step.id < activeStep;

        return (
          <button
            key={step.id}
            id={`timeline-step-${step.id}`}
            role="listitem"
            aria-label={`Step ${step.id}: ${step.title}${isActive ? " (selected)" : ""}`}
            aria-current={isActive ? "step" : undefined}
            aria-expanded={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => handleStepClick(step.id)}
            onKeyDown={(e) => handleStepKeyDown(e, step.id)}
            className={`group relative z-10 flex flex-col items-center gap-1.5 rounded-xl px-1 py-2 transition-all duration-300
              ${isActive ? "scale-105 bg-saffron-50" : "hover:bg-civic-50"}`}
          >
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-full border-2 text-lg transition-all duration-300
                ${
                  isActive
                    ? "border-saffron-500 bg-saffron-500 shadow-lg shadow-saffron-200"
                    : isPast
                      ? "border-indian-green bg-indian-green/10"
                      : "border-civic-300 bg-white group-hover:border-saffron-300"
                }`}
            >
              {step.icon}
            </div>
            <span
              className={`text-center text-[10px] font-semibold leading-tight sm:text-xs
                ${isActive ? "text-saffron-700" : isPast ? "text-indian-green" : "text-civic-600"}`}
            >
              {step.title}
            </span>
          </button>
        );
      }),
    [activeStep, handleStepClick, handleStepKeyDown]
  );

  return (
    <section
      className="rounded-2xl border border-civic-200 bg-white/80 p-5 shadow-sm backdrop-blur-sm"
      aria-label="Election timeline"
    >
      <h2 className="font-heading mb-4 text-lg font-semibold text-indian-navy">
        📅 Election Timeline
      </h2>

      <div className="relative" role="list" aria-label="Election process steps">
        <div
          className="absolute left-0 right-0 top-6 z-0 hidden h-0.5 bg-civic-200 sm:block"
          aria-hidden="true"
        >
          <div
            className="h-full bg-gradient-to-r from-saffron-500 to-indian-green transition-all duration-500 ease-out"
            style={{
              width: `${((activeStep - 1) / (TIMELINE_STEPS.length - 1)) * 100}%`,
            }}
          />
        </div>

        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 sm:gap-1">
          {renderedSteps}
        </div>
      </div>

      <div
        className="mt-4 animate-fade-in rounded-xl border border-civic-100 bg-civic-50 p-4"
        key={activeStep}
        role="region"
        aria-live="polite"
        aria-label={`Details for step ${activeStep}: ${activeData.title}`}
      >
        <div className="mb-1 flex items-center gap-2">
          <span className="text-xl">{activeData.icon}</span>
          <h3 className="font-heading text-sm font-bold text-indian-navy">
            Step {activeData.id}: {activeData.title}
          </h3>
        </div>
        <p className="text-sm leading-relaxed text-civic-700">
          {activeData.details}
        </p>
      </div>
    </section>
  );
});

ElectionTimeline.displayName = "ElectionTimeline";
export default ElectionTimeline;
