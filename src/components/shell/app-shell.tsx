"use client";

import { Suspense, lazy } from "react";
import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { CommandPalette } from "@/components/shell/command-palette";
import { Footer } from "@/components/shell/footer";
import { MobileNav } from "@/components/shell/mobile-nav";
import { useWorkspace } from "@/store/workspace";
import { ComingSoon } from "@/components/shell/coming-soon";
import { DashboardView } from "@/features/dashboard/dashboard-view";

const ChatView = lazy(() => import("@/features/chat/chat-view").then((m) => ({ default: m.ChatView })));
const DocumentsView = lazy(() =>
  import("@/features/documents/documents-view").then((m) => ({ default: m.DocumentsView }))
);
const ImagesView = lazy(() => import("@/features/images/images-view").then((m) => ({ default: m.ImagesView })));
const AgentsView = lazy(() => import("@/features/agents/agents-view").then((m) => ({ default: m.AgentsView })));
const BillingView = lazy(() => import("@/features/billing/billing-view").then((m) => ({ default: m.BillingView })));

export function AppShell() {
  const { activeModule } = useWorkspace();

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-y-auto scroll-thin pb-20 md:pb-0 flex flex-col">
          <div className="flex-1 min-h-0 flex flex-col">
            <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Loading…</div>}>
              {activeModule === "dashboard" && <DashboardView />}
              {activeModule === "chat" && <ChatView />}
              {activeModule === "documents" && <DocumentsView />}
              {activeModule === "images" && <ImagesView />}
              {activeModule === "agents" && <AgentsView />}
              {activeModule === "billing" && <BillingView />}
              {(activeModule === "seo" || activeModule === "marketing" || activeModule === "youtube") && (
                <ComingSoon module={activeModule} />
              )}
            </Suspense>
          </div>
          <Footer />
        </main>
      </div>
      <MobileNav />
      <CommandPalette />
    </div>
  );
}
