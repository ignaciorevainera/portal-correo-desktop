import { classifySearch, type SearchKind } from "./usernames";

export interface RecentSearch {
  value: string;
  kind: SearchKind;
}

export const RECENT_SEARCHES_KEY = "pcd_recent_searches";
export const RECENT_SEARCHES_EVENT = "pcd:recent-searches-changed";

const MAX_RECENT = 5;

function dedupe(items: RecentSearch[]): RecentSearch[] {
  const seen = new Set<string>();
  const result: RecentSearch[] = [];

  for (const item of items) {
    const key = item.value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }

  return result;
}

function persist(items: RecentSearch[]): void {
  try {
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(items));
  } catch {
    // localStorage puede no estar disponible; el historial es opcional.
  }

  try {
    window.dispatchEvent(new CustomEvent(RECENT_SEARCHES_EVENT));
  } catch {
    // Sin window (SSR/tests aislados) no hay suscriptores.
  }
}

export function loadRecentSearches(): RecentSearch[] {
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (!stored) return [];

    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];

    const items: RecentSearch[] = [];
    for (const entry of parsed) {
      if (typeof entry === "string") {
        const value = entry.trim();
        if (value) items.push({ value, kind: classifySearch(value) });
        continue;
      }

      if (entry && typeof entry === "object") {
        const candidate = entry as { value?: unknown; kind?: unknown };
        if (typeof candidate.value !== "string") continue;
        const value = candidate.value.trim();
        if (!value) continue;
        const kind: SearchKind =
          candidate.kind === "account" || candidate.kind === "terminal"
            ? candidate.kind
            : classifySearch(value);
        items.push({ value, kind });
      }
    }

    return dedupe(items).slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

export function saveRecentSearch(
  value: string,
  kind: SearchKind,
): RecentSearch[] {
  const clean = value.trim();
  if (!clean) return loadRecentSearches();

  const next = dedupe([{ value: clean, kind }, ...loadRecentSearches()]).slice(
    0,
    MAX_RECENT,
  );
  persist(next);
  return next;
}

export function removeRecentSearch(value: string): RecentSearch[] {
  const key = value.trim().toLowerCase();
  const next = loadRecentSearches().filter(
    (item) => item.value.toLowerCase() !== key,
  );
  persist(next);
  return next;
}

export function updateRecentSearchKind(
  value: string,
  kind: SearchKind,
): RecentSearch[] {
  const key = value.trim().toLowerCase();
  const next = loadRecentSearches().map((item) =>
    item.value.toLowerCase() === key ? { ...item, kind } : item,
  );
  persist(next);
  return next;
}

export function subscribeToRecentSearches(
  callback: () => void,
): () => void {
  window.addEventListener(RECENT_SEARCHES_EVENT, callback);
  return () => window.removeEventListener(RECENT_SEARCHES_EVENT, callback);
}
