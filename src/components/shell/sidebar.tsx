"use client";

import {
  LayoutDashboard,
  MessageSquare,
  FileText,
  Image as ImageIcon,
  Bot,
  Search,
  Megaphone,
  Youtube,
  CreditCard,
  Sparkles,
  PanelLeftClose,
  PanelLeft,
  Plus,
  ChevronRight,
} from "lucide-react";
import { useWorkspace, type ModuleKey } from "@/store/workspace";
import { useCurrentUser } from "@/hooks/use-current-user";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PLANS } from "@/lib/constants";

const NAV: {
  group: string;
  items: { key: ModuleKey; label: string; icon: typeof LayoutDashboard; soon?: boolean }[];
}[] = [
  {
    group: "Workspace",
    items: [{ key: "dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    group: "Create",
    items: [
      { key: "chat", label: "AI Chat", icon: MessageSquare },
      { key: "documents", label: "Documents", icon: FileText },
      { key: "images", label: "Images", icon: ImageIcon },
      { key: "agents", label: "AI Agents", icon: Bot },
    ],
  },
  {
    group: "Workspaces",
    items: [
      { key: "seo", label: "SEO", icon: Search, soon: true },
      { key: "marketing", label: "Marketing", icon: Megaphone, soon: true },
      { key: "youtube", label: "YouTube", icon: Youtube, soon: true },
    ],
  },
  {
    group: "Account",
    items: [{ key: "billing", label: "Plans & Credits", icon: CreditCard }],
  },
];

export function Sidebar() {
  const { activeModule, setActiveModule, sidebarCollapsed, toggleSidebar } = useWorkspace();
  const { data: user } = useCurrentUser();

  const planLabel = PLANS.find((p) => p.id === (user?.plan ?? "free"))?.name ?? "Free";
  const credits = user?.credits ?? 0;
  const planCredits = PLANS.find((p) => p.id === (user?.plan ?? "free"))?.credits ?? 200;
  const creditPct = Math.min(100, Math.round((credits / planCredits) * 100));

  return (
    <aside
      className={cn(
        "hidden md:flex shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground transition-[width] duration-300 ease-out",
        sidebarCollapsed ? "w-[68px]" : "w-[256px]"
      )}
    >
      {/* Brand */}
      <div className="flex h-16 items-center gap-2.5 px-4 border-b">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-teal-500 text-primary-foreground shadow-glow">
          <Sparkles className="h-5 w-5" />
        </div>
        {!sidebarCollapsed && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold leading-tight">NexusAI</p>
            <p className="truncate text-[11px] text-muted-foreground">Business OS</p>
          </div>
        )}
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={toggleSidebar}
                aria-label="Toggle sidebar"
              >
                {sidebarCollapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">{sidebarCollapsed ? "Expand" : "Collapse"}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* New chat button */}
      <div className="p-3">
        <Button
          className="w-full justify-start gap-2"
          onClick={() => setActiveModule("chat")}
        >
          <Plus className="h-4 w-4" />
          {!sidebarCollapsed && <span>New Chat</span>}
        </Button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto scroll-thin px-3 pb-3">
        {NAV.map((group) => (
          <div key={group.group} className="mb-4">
            {!sidebarCollapsed && (
              <p className="px-2 mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
                {group.group}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = activeModule === item.key;
                return (
                  <TooltipProvider key={item.key} delayDuration={sidebarCollapsed ? 100 : 600}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => setActiveModule(item.key)}
                          className={cn(
                            "group relative flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                            sidebarCollapsed && "justify-center",
                            active
                              ? "bg-sidebar-accent text-sidebar-accent-foreground"
                              : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                          )}
                        >
                          {active && (
                            <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
                          )}
                          <Icon className={cn("h-[18px] w-[18px] shrink-0", active && "text-primary")} />
                          {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                          {!sidebarCollapsed && item.soon && (
                            <Badge variant="outline" className="ml-auto h-5 px-1.5 text-[10px] font-normal text-muted-foreground">
                              Soon
                            </Badge>
                          )}
                        </button>
                      </TooltipTrigger>
                      {sidebarCollapsed && (
                        <TooltipContent side="right">{item.label}</TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Credit widget + user */}
      {!sidebarCollapsed ? (
        <div className="border-t p-3 space-y-3">
          <div className="rounded-xl border bg-card p-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-muted-foreground">Credits</span>
              <Badge variant="secondary" className="h-5 text-[10px]">{planLabel}</Badge>
            </div>
            <div className="flex items-baseline gap-1 mb-2">
              <span className="text-lg font-semibold tabular-nums">{credits.toLocaleString()}</span>
              <span className="text-xs text-muted-foreground">/ {planCredits.toLocaleString()}</span>
            </div>
            <Progress value={creditPct} className="h-1.5" />
          </div>
          <div className="flex items-center gap-2.5 px-1">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold">
                {(user?.name ?? "U").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">{user?.name ?? "Loading…"}</p>
              <p className="truncate text-[11px] text-muted-foreground">{user?.email}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      ) : (
        <div className="border-t p-3">
          <Avatar className="h-8 w-8 mx-auto">
            <AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold">
              {(user?.name ?? "U").slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
      )}
    </aside>
  );
}
