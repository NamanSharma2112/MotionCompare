/**
 * Human names for DOM elements.
 *
 * The breadcrumb should read "Checkout / Payment / Dropdown", not
 * `html > body > div:nth-child(3) > main > div > button`. Names come from the
 * strongest signal the markup offers — an accessible label, a data attribute
 * a component author chose, an id, a meaningful class — and generated or
 * utility class names are ignored because they name nothing.
 */

const UTILITY_CLASS =
  /^(-?(p|m)[trblxyse]?|w|h|min|max|size|flex|grid|gap|space|text|font|leading|tracking|bg|from|via|to|border|rounded|ring|outline|shadow|opacity|items|justify|content|self|place|order|col|row|basis|grow|shrink|overflow|truncate|absolute|relative|fixed|sticky|static|inset|top|right|bottom|left|z|block|inline|hidden|visible|table|transition|duration|ease|delay|animate|transform|scale|rotate|translate|skew|origin|cursor|select|pointer|sr|not|group|peer|container|aspect|object|fill|stroke|underline|line|list|whitespace|break|align|float|clear|isolate|mix|blur|backdrop|filter|drop|will|appearance|resize|scroll|snap|touch|divide|accent|caret|decoration)(-|$)/;
const GENERATED_CLASS =
  /^(css|sc|jsx|emotion|svelte|astro|chakra|mui|Mui[A-Z])[-_]|^[a-z]{1,3}[A-Za-z0-9]{5,}$|^_[A-Za-z0-9]{4,}|__[A-Za-z0-9]{4,6}$/;
const STATE_CLASS = /^(is|has)-|^(active|open|selected|disabled|hover|focus|visible|show|hidden|dark|light)$/;

const LANDMARKS: Record<string, string> = {
  nav: "Navigation",
  header: "Header",
  footer: "Footer",
  main: "Main",
  aside: "Sidebar",
  form: "Form",
  dialog: "Dialog",
  menu: "Menu",
  table: "Table",
};

function humanize(raw: string): string {
  const words = raw
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[-_.:]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return "";
  const sentence = words.join(" ").toLowerCase();
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}

/** The class that most plausibly names the component, if any. */
export function meaningfulClass(element: Element): string | null {
  for (const name of Array.from(element.classList)) {
    if (name.includes(":") || name.includes("[") || name.includes("/")) continue;
    if (name.startsWith("motionlab")) continue;
    if (UTILITY_CLASS.test(name) || STATE_CLASS.test(name)) continue;
    // CSS Modules: `Card_root__a1b2c` names the module, keep that part.
    const module = /^([A-Za-z][A-Za-z0-9]+)_([A-Za-z0-9]+)__[A-Za-z0-9-]{4,}$/.exec(name);
    if (module?.[1]) return module[2] && module[2] !== "root" ? `${module[1]}-${module[2]}` : module[1];
    if (GENERATED_CLASS.test(name)) continue;
    // BEM: `checkout-card__title` → the block plus element.
    return name.replace(/--.*$/, "");
  }
  return null;
}

export interface ElementName {
  name: string;
  /** How confident the name is: strong names make it into the breadcrumb. */
  strength: "strong" | "weak";
}

function shortText(element: Element): string | null {
  const text = (element.textContent ?? "").replace(/\s+/g, " ").trim();
  if (!text) return null;
  return text.length > 22 ? `${text.slice(0, 21)}…` : text;
}

export function nameElement(element: Element): ElementName {
  const label = element.getAttribute("aria-label");
  if (label?.trim()) return { name: humanize(label) || label.trim(), strength: "strong" };

  for (const attribute of ["data-component", "data-name", "data-testid", "data-test", "data-cy", "data-slot"]) {
    const value = element.getAttribute(attribute);
    if (value?.trim()) return { name: humanize(value), strength: "strong" };
  }

  if (element.id && !/\d{3,}|^:r/.test(element.id)) return { name: humanize(element.id), strength: "strong" };

  const className = meaningfulClass(element);
  if (className) return { name: humanize(className), strength: "strong" };

  const tag = element.tagName.toLowerCase();
  const role = element.getAttribute("role");
  if (role && LANDMARKS[role]) return { name: LANDMARKS[role]!, strength: "strong" };
  if (LANDMARKS[tag]) return { name: LANDMARKS[tag]!, strength: "strong" };

  if (tag === "button" || tag === "a" || role === "button") {
    const text = shortText(element);
    if (text) return { name: `“${text}” ${tag === "a" ? "link" : "button"}`, strength: "weak" };
  }
  if (/^h[1-6]$/.test(tag)) {
    const text = shortText(element);
    if (text) return { name: `“${text}” heading`, strength: "weak" };
  }
  return { name: tag, strength: "weak" };
}

/** `button.checkout-trigger`, the way a developer would write it. */
export function selectorFor(element: Element): string {
  const tag = element.tagName.toLowerCase();
  if (element.id && !/^:r/.test(element.id)) return `${tag}#${element.id}`;
  const className = Array.from(element.classList).find(
    (name) => !name.startsWith("motionlab") && !name.includes(":") && !name.includes("["),
  );
  const meaningful = meaningfulClass(element);
  const chosen = meaningful && element.classList.contains(meaningful) ? meaningful : className;
  return chosen ? `${tag}.${chosen}` : tag;
}

export interface PathEntry {
  element: Element;
  name: string;
  selector: string;
  strong: boolean;
}

/** The element and its ancestors up to `<body>`, nearest last. */
export function elementPath(element: Element): PathEntry[] {
  const entries: PathEntry[] = [];
  let current: Element | null = element;
  while (current && current !== document.body && current !== document.documentElement) {
    const named = nameElement(current);
    entries.unshift({
      element: current,
      name: named.name,
      selector: selectorFor(current),
      strong: named.strength === "strong",
    });
    current = current.parentElement;
  }
  return entries;
}

/**
 * The breadcrumb: up to three named ancestors plus the element itself. Only
 * strong names qualify as ancestors, and repeats collapse, so a stack of
 * anonymous wrappers contributes nothing.
 */
export function breadcrumbFor(element: Element): string[] {
  const path = elementPath(element);
  const self = path.at(-1);
  const ancestors: string[] = [];
  for (const entry of path.slice(0, -1).reverse()) {
    if (!entry.strong) continue;
    if (ancestors.includes(entry.name) || entry.name === self?.name) continue;
    ancestors.unshift(entry.name);
    if (ancestors.length === 2) break;
  }
  return [...ancestors, self?.name ?? element.tagName.toLowerCase()];
}
