const MAC =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

/** Render a key the way this platform writes it: ⌘ on Mac, Ctrl elsewhere. */
export function formatKey(key: string): string {
  if (key === "Mod") return MAC ? "⌘" : "Ctrl";
  if (key === "Shift") return MAC ? "⇧" : "Shift";
  if (key === "Escape") return "Esc";
  if (key === " " || key === "Space") return "Space";
  return key.length === 1 ? key.toUpperCase() : key;
}

export function Kbd({ keys }: { keys: string | string[] }) {
  const list = Array.isArray(keys) ? keys : [keys];
  return (
    <span className="mlui-kbds">
      {list.map((key) => (
        <kbd key={key} className="mlui-kbd">
          {formatKey(key)}
        </kbd>
      ))}
    </span>
  );
}

export const isMac = MAC;
