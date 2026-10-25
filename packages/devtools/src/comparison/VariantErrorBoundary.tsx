"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import type { VariantId } from "@motionlab/core";

export interface VariantErrorBoundaryProps {
  variant: VariantId;
  children: ReactNode;
  onError?(variant: VariantId, error: Error): void;
}

interface VariantErrorBoundaryState {
  error: Error | null;
}

/**
 * Isolates one variant's failure.
 *
 * MotionLab renders the developer's real component, which means it can throw —
 * and a devtool that takes the host application down with it is worse than no
 * devtool. Each side is wrapped separately, so "Variant A failed" still leaves
 * B running and comparable.
 */
export class VariantErrorBoundary extends Component<
  VariantErrorBoundaryProps,
  VariantErrorBoundaryState
> {
  state: VariantErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): VariantErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    this.props.onError?.(this.props.variant, error);
    // Surfaced in the console as well: the overlay has room for the message,
    // not for a component stack the developer will want.
    console.error(
      `[MotionLab] Variant ${this.props.variant} failed to render.`,
      error,
      info.componentStack,
    );
  }

  componentDidUpdate(previous: VariantErrorBoundaryProps): void {
    // A new child is a new chance: re-arm so fixing the component in place
    // does not require closing and reopening the target.
    if (previous.children !== this.props.children && this.state.error) {
      this.setState({ error: null });
    }
  }

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="ml-stage-error" role="alert">
        <strong>Variant {this.props.variant} failed</strong>
        <span className="ml-stage-error-detail">{error.message}</span>
      </div>
    );
  }
}
