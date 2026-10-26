"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "./icons";

/**
 * A single quiet confirmation ("Copied"), shown inside the panel. Feedback
 * that a silent action happened — never a modal, never stacked.
 */
export function useToast(duration = 1400) {
  const [message, setMessage] = useState<string | null>(null);
  const [key, setKey] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const show = useCallback(
    (next: string) => {
      setMessage(next);
      setKey((value) => value + 1);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setMessage(null), duration);
    },
    [duration],
  );

  const node = message ? (
    <div key={key} className="mlui-toast" role="status" aria-live="polite">
      <Icon name="check" size={12} />
      {message}
    </div>
  ) : null;

  return { show, node };
}
