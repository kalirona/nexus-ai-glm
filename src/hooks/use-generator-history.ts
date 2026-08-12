"use client";

import { useCallback, useState } from "react";
import { api } from "@/lib/api-client";

/**
 * Persists recent generator outputs (SEO / Marketing / YouTube) to the DB
 * so they follow the user across devices. Falls back to localStorage if the
 * API is unreachable. Capped at 10 entries per module.
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

function loadLocal(key: string): HistoryEntry[] {
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

function saveLocal(key: string, list: HistoryEntry[]) {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    /* storage might be full / unavailable */
  }
}

export function useGeneratorHistory(module: string, max = 10) {
  const key = `${PREFIX}${module}`;
  // Lazy init from localStorage so the UI renders instantly on mount.
  // The DB fetch happens in the consuming component via useQuery.
  const [entries, setEntries] = useState<HistoryEntry[]>(() => loadLocal(key));

  /** Replace local state (called after a successful DB fetch). */
  const hydrate = useCallback((dbEntries: HistoryEntry[]) => {
    setEntries(dbEntries);
    saveLocal(key, dbEntries);
  }, [key]);

  const add = useCallback(
    async (entry: Omit<HistoryEntry, "id" | "createdAt">) => {
      const full: HistoryEntry = {
        ...entry,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        createdAt: Date.now(),
      };
      // Optimistic update
      setEntries((prev) => {
        const next = [full, ...prev].slice(0, max);
        saveLocal(key, next);
        return next;
      });
      // Persist to DB (best-effort — silent failure keeps the local entry)
      try {
        const dbEntry = await api<HistoryEntry>("/api/history", {
          method: "POST",
          body: JSON.stringify({
            module,
            tool: entry.tool,
            toolLabel: entry.toolLabel,
            input: entry.input,
            result: entry.result,
          }),
        });
        // Replace the optimistic id with the real DB id + createdAt
        if (dbEntry?.id) {
          setEntries((prev) => {
            const next = prev.map((e) =>
              e.id === full.id
                ? { ...e, id: dbEntry.id, createdAt: new Date(dbEntry.createdAt).getTime() || e.createdAt }
                : e
            );
            saveLocal(key, next);
            return next;
          });
        }
        return dbEntry;
      } catch {
        return full;
      }
    },
    [key, max, module]
  );

  const remove = useCallback(
    async (id: string) => {
      setEntries((prev) => {
        const next = prev.filter((e) => e.id !== id);
        saveLocal(key, next);
        return next;
      });
      // Best-effort DB delete (id may be a temporary local id)
      try {
        await api(`/api/history/${id}`, { method: "DELETE" });
      } catch {
        /* ignore — might be a local-only id */
      }
    },
    [key]
  );

  const clear = useCallback(() => {
    setEntries([]);
    saveLocal(key, []);
  }, [key]);

  return { entries, hydrate, add, remove, clear };
}
