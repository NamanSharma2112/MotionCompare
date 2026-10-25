"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Copy to clipboard with a confirmation flag the UI can show.
 *
 * Falls back to a hidden textarea and `execCommand` because the async
 * Clipboard API is unavailable in exactly the places MotionLab runs: an
 * insecure-origin dev server, and a content script on a page whose permissions
 * policy blocks clipboard-write.
 */
export function useClipboard(resetAfterMs = 1600) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const copy = useCallback(
    async (text: string) => {
      let ok = false;
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(text);
          ok = true;
        }
      } catch {
        ok = false;
      }

      if (!ok && typeof document !== "undefined") {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        textarea.style.pointerEvents = "none";
        document.body.appendChild(textarea);
        textarea.select();
        try {
          ok = document.execCommand("copy");
        } catch {
          ok = false;
        }
        textarea.remove();
      }

      setCopied(ok);
      if (timer.current) clearTimeout(timer.current);
      if (ok) timer.current = setTimeout(() => setCopied(false), resetAfterMs);
      return ok;
    },
    [resetAfterMs],
  );

  return { copy, copied };
}
