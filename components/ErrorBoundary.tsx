"use client";

import React, { Component } from "react";
import type { ErrorBoundaryProps, ErrorBoundaryState } from "@/types";

/**
 * ErrorBoundary — Catches JavaScript errors in child components and
 * displays a fallback UI with a retry button.
 *
 * This is implemented as a class component because React's error boundary
 * API (componentDidCatch, getDerivedStateFromError) is only available
 * for class components.
 *
 * Usage:
 * ```tsx
 * <ErrorBoundary>
 *   <ChatInterface />
 * </ErrorBoundary>
 * ```
 */
export default class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  /**
   * Updates state when an error is caught during rendering.
   * @param error - The error that was thrown
   * @returns Updated state to trigger fallback UI
   */
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  /**
   * Logs error details for debugging and monitoring.
   * On Cloud Run, console.error output is captured by Google Cloud Logging.
   *
   * @param error - The error that was thrown
   * @param errorInfo - Additional React component stack information
   */
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error(
      JSON.stringify({
        severity: "ERROR",
        message: "React ErrorBoundary caught an error",
        service: "election-assistant",
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        googleServices: ["cloud-logging", "cloud-run"],
      })
    );
  }

  /**
   * Resets the error state to allow the user to retry.
   * Called when the "Try Again" button is clicked.
   */
  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      // Custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div
          className="flex h-[400px] flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50 p-8 text-center"
          role="alert"
          aria-live="assertive"
        >
          <div className="mb-4 text-5xl">⚠️</div>
          <h3 className="mb-2 text-lg font-bold text-red-800">
            Something went wrong
          </h3>
          <p className="mb-4 max-w-sm text-sm text-red-600">
            An unexpected error occurred. Please try again or refresh the page.
          </p>
          {this.state.error && (
            <p className="mb-4 max-w-md rounded-lg bg-red-100 px-3 py-2 text-xs text-red-500">
              {this.state.error.message}
            </p>
          )}
          <button
            onClick={this.handleRetry}
            aria-label="Try again"
            className="rounded-xl bg-indian-navy px-6 py-2.5 text-sm font-semibold text-white
                       shadow-md transition-all hover:bg-civic-800 hover:shadow-lg active:scale-95"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
