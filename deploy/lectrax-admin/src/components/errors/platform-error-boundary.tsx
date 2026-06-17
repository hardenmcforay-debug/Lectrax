"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { ErrorFallback } from "@/components/errors/error-fallback";
import { logClientCrash } from "@/lib/errors/logger";

type PlatformErrorBoundaryProps = {
  children: ReactNode;
  scope?: string;
};

type PlatformErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
};

export class PlatformErrorBoundary extends Component<
  PlatformErrorBoundaryProps,
  PlatformErrorBoundaryState
> {
  state: PlatformErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): PlatformErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    logClientCrash(this.props.scope ?? "PlatformErrorBoundary", error, {
      componentStack: info.componentStack,
    });
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="p-4 sm:p-6">
          <ErrorFallback
            category="unknown"
            onRetry={this.handleRetry}
            showGoBack
            showReload
          />
        </div>
      );
    }

    return this.props.children;
  }
}
