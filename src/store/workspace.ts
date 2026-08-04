"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ModuleKey =
  | "dashboard"
  | "chat"
  | "documents"
  | "images"
  | "agents"
  | "seo"
  | "marketing"
  | "youtube"
  | "billing";

export interface PendingAgent {
  key: string;
  name: string;
  systemPrompt: string;
  greeting: string;
}

interface WorkspaceState {
  activeModule: ModuleKey;
  activeChatId: string | null;
  commandOpen: boolean;
  sidebarCollapsed: boolean;
  pendingAgent: PendingAgent | null;
  setActiveModule: (m: ModuleKey) => void;
  setActiveChat: (id: string | null) => void;
  setCommandOpen: (v: boolean) => void;
  toggleSidebar: () => void;
  setPendingAgent: (a: PendingAgent | null) => void;
}

export const useWorkspace = create<WorkspaceState>()(
  persist(
    (set) => ({
      activeModule: "dashboard",
      activeChatId: null,
      commandOpen: false,
      sidebarCollapsed: false,
      pendingAgent: null,
      setActiveModule: (m) => set({ activeModule: m }),
      setActiveChat: (id) => set({ activeChatId: id }),
      setCommandOpen: (v) => set({ commandOpen: v }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setPendingAgent: (a) => set({ pendingAgent: a }),
    }),
    {
      name: "nexus-ws",
      // Don't persist transient UI state like pendingAgent / commandOpen
      partialize: (s) => ({
        activeModule: s.activeModule,
        sidebarCollapsed: s.sidebarCollapsed,
      }),
    }
  )
);

