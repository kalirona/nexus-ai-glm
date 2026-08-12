"use client";

import { Suspense, lazy } from "react";
import { Sidebar, MobileSidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { CommandPalette } from "@/components/shell/command-palette";
import { MobileNav } from "@/components/shell/mobile-nav";
import { PaywallModal } from "@/components/paywall/paywall-modal";
import { OnboardingOverlay } from "@/components/onboarding/onboarding-overlay";
import { useWorkspace } from "@/store/workspace";
import { DashboardView } from "@/features/dashboard/dashboard-view";
import { Skeleton } from "@/components/ui/skeleton";

const ChatView = lazy(() => import("@/features/chat/chat-view").then((m) => ({ default: m.ChatView })));
const DocumentsView = lazy(() =>
  import("@/features/documents/documents-view").then((m) => ({ default: m.DocumentsView }))
);
const ImagesView = lazy(() => import("@/features/images/images-view").then((m) => ({ default: m.ImagesView })));
const AgentsView = lazy(() => import("@/features/agents/agents-view").then((m) => ({ default: m.AgentsView })));
const BillingView = lazy(() => import("@/features/billing/billing-view").then((m) => ({ default: m.BillingView })));
const SettingsView = lazy(() => import("@/features/settings/settings-view").then((m) => ({ default: m.SettingsView })));
const AdminView = lazy(() => import("@/features/admin/admin-view").then((m) => ({ default: m.AdminView })));
const AIInfraView = lazy(() => import("@/features/ai-infra/ai-infra-view").then((m) => ({ default: m.AIInfraView })));
const BrandVoiceView = lazy(() =>
  import("@/features/brand-voice/brand-voice-view").then((m) => ({ default: m.BrandVoiceView }))
);
const SeoView = lazy(() => import("@/features/seo/seo-view").then((m) => ({ default: m.SeoView })));
const MarketingView = lazy(() =>
  import("@/features/marketing/marketing-view").then((m) => ({ default: m.MarketingView }))
);
const YoutubeView = lazy(() =>
  import("@/features/youtube/youtube-view").then((m) => ({ default: m.YoutubeView }))
);

function ModuleSkeleton() {
  return (
    <div className="space-y-4 p-4 md:p-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-72" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}

export function AppShell() {
  const { activeModule } = useWorkspace();

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <Sidebar />
      <MobileSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-y-auto scroll-thin pb-20 md:pb-0">
          <Suspense fallback={<ModuleSkeleton />}>
            {activeModule === "dashboard" && <DashboardView />}
            {activeModule === "chat" && <ChatView />}
            {activeModule === "documents" && <DocumentsView />}
            {activeModule === "images" && <ImagesView />}
            {activeModule === "agents" && <AgentsView />}
            {activeModule === "billing" && <BillingView />}
            {activeModule === "settings" && <SettingsView />}
            {activeModule === "admin" && <AdminView />}
            {activeModule === "ai-infra" && <AIInfraView />}
            {activeModule === "brand-voice" && <BrandVoiceView />}
            {activeModule === "seo" && <SeoView />}
            {activeModule === "marketing" && <MarketingView />}
            {activeModule === "youtube" && <YoutubeView />}
          </Suspense>
        </main>
      </div>
      <MobileNav />
      <CommandPalette />
      <PaywallModal />
      <OnboardingOverlay />
    </div>
  );
}
