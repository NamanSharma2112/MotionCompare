"use client";

import { useMemo, useState } from "react";
import {
  exportVariant,
  getVariant,
  type Experiment,
  type ExportFormat,
  type VariantId,
} from "@motionlab/core";
import { useClipboard } from "@motionlab/react";

const FORMATS: Array<{ id: ExportFormat; label: string }> = [
  { id: "motion", label: "Motion" },
  { id: "json", label: "JSON" },
  { id: "css", label: "CSS" },
];

export interface ExportPanelProps {
  experiment: Experiment;
  /** Which side to export. Defaults to the winner, falling back to A. */
  variant?: VariantId;
}

/**
 * The end of the loop: the code the developer pastes back into their component.
 *
 * Export honours the winner when one has been chosen, because "Copy Winner"
 * should never be ambiguous about what it copied.
 */
export function ExportPanel({ experiment, variant }: ExportPanelProps) {
  const [format, setFormat] = useState<ExportFormat>("motion");
  const { copy, copied } = useClipboard();

  const target = variant ?? experiment.winner ?? "A";
  const result = useMemo(() => exportVariant(experiment, target, format), [experiment, target, format]);
  const name = getVariant(experiment, target).name ?? `Variant ${target}`;

  return (
    <div className="ml-export">
      <div className="ml-footer-row">
        <span className="dk-label">export</span>
        <div className="dk-segment">
          {FORMATS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              className="dk-button"
              data-selected={format === entry.id}
              onClick={() => setFormat(entry.id)}
            >
              {entry.label}
            </button>
          ))}
        </div>
        <span className="dk-hint" style={{ marginLeft: "auto" }}>
          {experiment.winner ? `winner · ${name}` : name}
        </span>
        <button
          type="button"
          className="dk-button"
          data-accent="true"
          onClick={() => void copy(result.code)}
        >
          {copied ? "Copied" : experiment.winner ? "Copy Winner" : `Copy ${target}`}
        </button>
      </div>

      <pre className="ml-code">
        <code>{result.code}</code>
      </pre>

      {result.caveat ? <p className="ml-caveat">{result.caveat}</p> : null}
    </div>
  );
}
