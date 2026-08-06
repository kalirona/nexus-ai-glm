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
  | "billing"
  | "settings"
  | "admin"
  | "ai-infra";

export interface PendingAgent {
  key: string;
  name: string;
  systemPrompt: string;
  greeting: string;
}

interface PaywallState {
  open: boolean;
  reason: string;
  feature: string;
}

interface WorkspaceState {
  activeModule: ModuleKey;
  activeChatId: string | null;
  commandOpen: boolean;
  sidebarCollapsed: boolean;
  mobileSidebarOpen: boolean;
  pendingAgent: PendingAgent | null;
  paywall: PaywallState;
  setActiveModule: (m: ModuleKey) => void;
  setActiveChat: (id: string | null) => void;
  setCommandOpen: (v: boolean) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (v: boolean) => void;
  setMobileSidebarOpen: (v: boolean) => void;
  setPendingAgent: (a: PendingAgent | null) => void;
  openPaywall: (feature: string, reason?: string) => void;
  closePaywall: () => void;
}

export const useWorkspace = create<WorkspaceState>()(
  persist(
    (set) => ({
      activeModule: "dashboard",
      activeChatId: null,
      commandOpen: false,
      sidebarCollapsed: false,
      mobileSidebarOpen: false,
      pendingAgent: null,
      paywall: { open: false, reason: "", feature: "" },
      setActiveModule: (m) => set({ activeModule: m }),
      setActiveChat: (id) => set({ activeChatId: id }),
      setCommandOpen: (v) => set({ commandOpen: v }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
      setMobileSidebarOpen: (v) => set({ mobileSidebarOpen: v }),
      setPendingAgent: (a) => set({ pendingAgent: a }),
      openPaywall: (feature, reason = "") => set({ paywall: { open: true, feature, reason } }),
      closePaywall: () => set({ paywall: { open: false, reason: "", feature: "" } }),
    }),
    {
      name: "nexus-ws",
      version: 2, // bump to discard stale persisted `sidebarCollapsed` from v1
      // Only persist the active module — NOT sidebarCollapsed.
      // The sidebar must always start OPEN on load and only collapse on an
      // explicit click of the collapse button.
      partialize: (s) => ({
        activeModule: s.activeModule,
      }),
    }
  )
);


