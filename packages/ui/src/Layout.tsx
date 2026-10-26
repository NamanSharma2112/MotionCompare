"use client";

import type { ReactNode } from "react";

export interface SectionProps {
  label?: string;
  aside?: ReactNode;
  children: ReactNode;
  id?: string;
}

/**
 * A region of the inspector. Hierarchy comes from the tiny label and a single
 * hairline between sections — not from a box around each one.
 */
export function Section({ label, aside, children, id }: SectionProps) {
  return (
    <section className="mlui-section" aria-labelledby={label && id ? `${id}-label` : undefined}>
      {label || aside ? (
        <div className="mlui-section-head">
          {label ? (
            <h3 id={id ? `${id}-label` : undefined} className="mlui-section-label" style={{ margin: 0 }}>
              {label}
            </h3>
          ) : null}
          {aside ? <div className="mlui-section-aside">{aside}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function InspectorRow({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="mlui-row">
      <span className="mlui-row-label">{label}</span>
      <span>{children}</span>
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mlui-empty">
      <div className="mlui-empty-title">{title}</div>
      <p className="mlui-empty-body">{body}</p>
      {action}
    </div>
  );
}

export function StatusDot({
  tone,
  pulse,
}: {
  tone?: "success" | "accent" | "record" | "warning";
  pulse?: boolean;
}) {
  return <span className="mlui-dot" data-tone={tone} data-pulse={pulse ? "" : undefined} aria-hidden="true" />;
}

export function Badge({ children, tone }: { children: ReactNode; tone?: "success" | "accent" | "record" | "warning" }) {
  return (
    <span className="mlui-badge">
      {tone ? <StatusDot tone={tone} /> : null}
      {children}
    </span>
  );
}
