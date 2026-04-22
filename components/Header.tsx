"use client";

import React, { useState } from "react";

/** Supported UI languages */
type Language = "en" | "hi" | "ta";

interface LanguageOption {
  code: Language;
  label: string;
}

const LANGUAGES: LanguageOption[] = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिंदी" },
  { code: "ta", label: "தமிழ்" },
];

/**
 * Header component with app branding, Indian flag accent,
 * and language selector dropdown.
 */
export default function Header() {
  const [language, setLanguage] = useState<Language>("en");

  return (
    <header className="relative w-full" role="banner">
      {/* Tricolour accent strip */}
      <div className="flex h-1.5 w-full" aria-hidden="true">
        <div className="flex-1 bg-saffron-500" />
        <div className="flex-1 bg-white" />
        <div className="flex-1 bg-indian-green" />
      </div>

      {/* Main nav bar */}
      <nav
        className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8"
        aria-label="Primary navigation"
      >
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indian-navy text-xl text-white shadow-lg shadow-indian-navy/20">
            🗳️
          </div>
          <div>
            <h1 className="font-heading text-xl font-bold tracking-tight text-indian-navy sm:text-2xl">
              ElectionBot
            </h1>
            <p className="text-xs font-medium text-civic-600 sm:text-sm">
              Your Civic Education Assistant
            </p>
          </div>
        </div>

        {/* Language selector */}
        <div className="flex items-center gap-2">
          <label
            htmlFor="language-select"
            className="hidden text-sm font-medium text-civic-700 sm:inline"
          >
            🌐
          </label>
          <select
            id="language-select"
            aria-label="Select language"
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
            className="rounded-lg border border-civic-200 bg-white px-3 py-1.5 text-sm font-medium text-civic-800
                       shadow-sm transition-all hover:border-saffron-400 focus:border-saffron-500
                       focus:ring-2 focus:ring-saffron-200"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>
      </nav>

      {/* Bottom border gradient */}
      <div
        className="h-px w-full bg-gradient-to-r from-saffron-400 via-civic-200 to-indian-green"
        aria-hidden="true"
      />
    </header>
  );
}
