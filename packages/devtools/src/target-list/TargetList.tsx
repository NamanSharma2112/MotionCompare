"use client";

import type { MotionLabTargetDefinition } from "@motionlab/react";

export interface TargetListProps {
  targets: MotionLabTargetDefinition[];
  openTargetId: string | null;
  onSelect(id: string): void;
}

/**
 * The registered targets, as a list to pick from.
 *
 * When nothing is registered this says how to register something rather than
 * showing an empty box — the most likely reason the list is empty is that the
 * developer has mounted the devtools but not yet added a target.
 */
export function TargetList({ targets, openTargetId, onSelect }: TargetListProps) {
  if (targets.length === 0) {
    return (
      <div className="ml-empty">
        No targets registered yet. Add one anywhere in your tree:
        <br />
        <br />
        <code>
          {"<MotionLabTarget"}
          <br />
          {'  id="checkout-card"'}
          <br />
          {"  render={() => <CheckoutCard />}"}
          <br />
          {"  from={{ opacity: 0, y: 20 }}"}
          <br />
          {"  to={{ opacity: 1, y: 0 }}"}
          <br />
          {"/>"}
        </code>
      </div>
    );
  }

  return (
    <div className="ml-picker-list">
      {targets.map((target) => (
        <button
          key={target.id}
          type="button"
          className="ml-target"
          data-open={openTargetId === target.id}
          onClick={() => onSelect(target.id)}
        >
          <span className="ml-target-dot" aria-hidden="true" />
          <span>{target.label}</span>
          <span className="ml-target-id">{target.id}</span>
        </button>
      ))}
    </div>
  );
}
