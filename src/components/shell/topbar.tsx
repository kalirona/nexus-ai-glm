"use client";

import { Search, Moon, Sun, Bell, Command, Menu } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useWorkspace, type ModuleKey } from "@/store/workspace";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sparkles, Zap, TrendingUp } from "lucide-react";

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
  settings: { title: "Settings", sub: "Account, brand voice & API keys" },
};

export function Topbar() {
  const { setTheme, theme } = useTheme();
  const { activeModule, setCommandOpen, setMobileSidebarOpen, setActiveModule } = useWorkspace();

  const meta = TITLES[activeModule];

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b bg-background/80 glass px-3 md:gap-3 md:px-6">
      {/* Hamburger — mobile only */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden shrink-0"
        onClick={() => setMobileSidebarOpen(true)}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-base font-semibold leading-tight md:text-lg">{meta.title}</h1>
        <p className="hidden truncate text-xs text-muted-foreground sm:block">{meta.sub}</p>
      </div>

      {/* Search trigger — desktop */}
      <button
        onClick={() => setCommandOpen(true)}
        className="group hidden lg:flex items-center gap-2 h-9 w-56 xl:w-72 rounded-lg border bg-muted/40 px-3 text-sm text-muted-foreground transition-colors hover:bg-muted"
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
        className="md:hidden shrink-0"
        onClick={() => setCommandOpen(true)}
        aria-label="Search"
      >
        <Search className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        aria-label="Toggle theme"
        className="shrink-0"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      >
        <Sun className="hidden h-4 w-4 dark:block" />
        <Moon className="block h-4 w-4 dark:hidden" />
      </Button>

      {/* Notifications — functional dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Notifications" className="relative shrink-0">
            <Bell className="h-4 w-4" />
            <Badge className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-primary p-0" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <DropdownMenuLabel className="flex items-center justify-between">
            <span>Notifications</span>
            <Badge variant="secondary" className="text-[10px]">3 new</Badge>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <NotificationItem
            icon={<Zap className="h-4 w-4 text-amber-500" />}
            title="Credits running low"
            desc="You've used 80% of your monthly credits."
            time="2h ago"
            onClick={() => setActiveModule("billing")}
          />
          <NotificationItem
            icon={<Sparkles className="h-4 w-4 text-primary" />}
            title="Brand Voice is here"
            desc="Keep your content on-brand across every module."
            time="1d ago"
            onClick={() => setActiveModule("settings")}
          />
          <NotificationItem
            icon={<TrendingUp className="h-4 w-4 text-emerald-500" />}
            title="Weekly report ready"
            desc="Your 7-day usage summary is available."
            time="2d ago"
            onClick={() => setActiveModule("dashboard")}
          />
          <DropdownMenuSeparator />
          <DropdownMenuItem className="justify-center text-xs text-muted-foreground">
            View all notifications
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}

function NotificationItem({
  icon,
  title,
  desc,
  time,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  time: string;
  onClick: () => void;
}) {
  return (
    <DropdownMenuItem onClick={onClick} className="flex items-start gap-3 py-2.5">
      <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-muted">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-medium">{title}</p>
          <span className="shrink-0 text-[10px] text-muted-foreground">{time}</span>
        </div>
        <p className="line-clamp-2 text-xs text-muted-foreground">{desc}</p>
      </div>
    </DropdownMenuItem>
  );
}
