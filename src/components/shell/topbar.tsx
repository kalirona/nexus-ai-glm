"use client";

import { Search, Moon, Sun, Bell, Command } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useWorkspace, type ModuleKey } from "@/store/workspace";

const TITLES: Record<ModuleKey, { title: string; sub: string }> = {
  dashboard: { title: "Dashboard", sub: "Your business at a glance" },
  chat: { title: "AI Chat", sub: "Multi-model workspace with memory" },
  documents: { title: "AI Documents", sub: "Generate business-ready content" },
  images: { title: "AI Images", sub: "Create, edit and ship visuals" },
  agents: { title: "AI Agents", sub: "Specialised assistants for every job" },
  seo: { title: "SEO Workspace", sub: "Audit, research & optimise" },
  marketing: { title: "Marketing Workspace", sub: "Campaigns, ads & funnels" },
  youtube: { title: "YouTube Workspace", sub: "Titles, scripts & thumbnails" },
  billing: { title: "Plans & Credits", sub: "Manage your subscription" },
};

export function Topbar() {
  const { setTheme, theme } = useTheme();
  const { activeModule, setCommandOpen } = useWorkspace();

  const meta = TITLES[activeModule];

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/80 glass px-4 md:px-6">
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-base font-semibold leading-tight md:text-lg">{meta.title}</h1>
        <p className="truncate text-xs text-muted-foreground">{meta.sub}</p>
      </div>

      {/* Search trigger */}
      <button
        onClick={() => setCommandOpen(true)}
        className="group hidden sm:flex items-center gap-2 h-9 w-56 lg:w-72 rounded-lg border bg-muted/40 px-3 text-sm text-muted-foreground transition-colors hover:bg-muted"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Search or jump to…</span>
        <kbd className="flex items-center gap-0.5 rounded border bg-background px-1.5 py-0.5 text-[10px] font-medium">
          <Command className="h-3 w-3" />K
        </kbd>
      </button>

      <Button
        variant="ghost"
        size="icon"
        className="sm:hidden"
        onClick={() => setCommandOpen(true)}
        aria-label="Search"
      >
        <Search className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        aria-label="Toggle theme"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      >
        <Sun className="hidden h-4 w-4 dark:block" />
        <Moon className="block h-4 w-4 dark:hidden" />
      </Button>

      <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
        <Bell className="h-4 w-4" />
        <Badge className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-primary p-0" />
      </Button>
    </header>
  );
}
