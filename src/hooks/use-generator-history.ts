"use client";

import { useCallback, useState } from "react";

/**
 * Persists a list of recent items per module (e.g. SEO, Marketing, YouTube)
 * in localStorage. Each item stores the tool id, a short label, the result,
 * and a timestamp. We cap the list at `max` entries (default 10).
 *
 * NOTE: We deliberately avoid useEffect+setState (which the React 19 lint rule
 * flags as a cascading render). Instead we lazily initialise state from
 * localStorage in the useState initializer — this runs once on the client
 * during hydration and never again.
 */

export interface HistoryEntry {
  id: string;
  tool: string;
  toolLabel: string;
  input: string;
  result: string;
  createdAt: number; // epoch ms
}

const PREFIX = "nexus-history:";

function loadEntries(key: string): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw) as HistoryEntry[];
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    /* ignore corrupt storage */
  }
  return [];
}

export function useGeneratorHistory(module: string, max = 10) {
  const key = `${PREFIX}${module}`;
  // Lazy init — runs once on client, no effect needed.
  const [entries, setEntries] = useState<HistoryEntry[]>(() => loadEntries(key));

  const persist = useCallback(
    (list: HistoryEntry[]) => {
      setEntries(list);
      try {
        localStorage.setItem(key, JSON.stringify(list));
      } catch {
        /* storage might be full / unavailable */
      }
    },
    [key]
  );

  const add = useCallback(
    (entry: Omit<HistoryEntry, "id" | "createdAt">) => {
      const full: HistoryEntry = {
        ...entry,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        createdAt: Date.now(),
      };
      setEntries((prev) => {
        const next = [full, ...prev].slice(0, max);
        try {
          localStorage.setItem(key, JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });
      return full;
    },
    [key, max]
  );

  const remove = useCallback(
    (id: string) => {
      setEntries((prev) => {
        const next = prev.filter((e) => e.id !== id);
        try {
          localStorage.setItem(key, JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });
    },
    [key]
  );

  const clear = useCallback(() => {
    persist([]);
  }, [persist]);

  return { entries, add, remove, clear };
}
