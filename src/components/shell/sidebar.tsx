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
  Settings as SettingsIcon,
  LogOut,
  User as UserIcon,
  Moon,
  Sun,
  ChevronRight,
  Shield,
} from "lucide-react";
import { useTheme } from "next-themes";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { PLANS } from "@/lib/constants";
import { toast } from "sonner";
import { type LucideIcon } from "lucide-react";

interface NavItem {
  key: ModuleKey;
  label: string;
  icon: LucideIcon;
  soon?: boolean;
}
interface NavGroup {
  group: string;
  items: NavItem[];
}

const BASE_NAV: NavGroup[] = [
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
    items: [
      { key: "billing", label: "Plans & Credits", icon: CreditCard },
      { key: "settings", label: "Settings", icon: SettingsIcon },
    ],
  },
];

const ADMIN_NAV: NavGroup = {
  group: "Super Admin",
  items: [{ key: "admin", label: "Platform Control", icon: Shield }],
};

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useWorkspace();

  return (
    <aside
      className={cn(
        "hidden md:flex shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground transition-[width] duration-300 ease-out",
        sidebarCollapsed ? "w-[72px]" : "w-[264px]"
      )}
    >
      <SidebarContent collapsed={sidebarCollapsed} onToggleCollapse={toggleSidebar} />
    </aside>
  );
}

/** Mobile sidebar — opens as a Sheet drawer from the hamburger button. */
export function MobileSidebar() {
  const { mobileSidebarOpen, setMobileSidebarOpen, setActiveModule } = useWorkspace();

  const go = (m: ModuleKey) => {
    setActiveModule(m);
    setMobileSidebarOpen(false);
  };

  return (
    <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
      <SheetContent side="left" className="w-[280px] p-0 bg-sidebar text-sidebar-foreground">
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <div className="flex h-full flex-col">
          <SidebarContent collapsed={false} onNavigate={go} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** Shared sidebar body — used by both desktop <aside> and mobile <Sheet>. */
function SidebarContent({
  collapsed = false,
  onToggleCollapse,
  onNavigate,
}: {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onNavigate?: (m: ModuleKey) => void;
}) {
  const { activeModule, setActiveModule } = useWorkspace();
  const { data: user } = useCurrentUser();
  const { theme, setTheme } = useTheme();

  const isAdmin = !!user?.isAdmin;

  const planLabel = PLANS.find((p) => p.id === (user?.plan ?? "free"))?.name ?? "Free";
  const credits = user?.credits ?? 0;
  const planCredits = PLANS.find((p) => p.id === (user?.plan ?? "free"))?.credits ?? 200;
  const creditPct = Math.min(100, Math.round((credits / planCredits) * 100));

  const navigate = (m: ModuleKey) => {
    setActiveModule(m);
    onNavigate?.(m);
  };

  const initials = (user?.name ?? "U").slice(0, 2).toUpperCase();

  // Build the nav list — insert the Super Admin group before Account when admin
  const navGroups: NavGroup[] = isAdmin
    ? [...BASE_NAV.slice(0, 3), ADMIN_NAV, BASE_NAV[3]]
    : BASE_NAV;

  return (
    <>
      {/* Brand row — fixed comfortable height, logo + expand button always visible */}
      <div
        className={cn(
          "flex shrink-0 items-center border-b",
          collapsed
            ? "h-auto flex-col gap-2.5 py-3.5 px-2"
            : "h-[60px] gap-2.5 px-4"
        )}
      >
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-teal-500 text-primary-foreground shadow-glow">
          <Sparkles className="h-5 w-5" />
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold leading-tight">NexusAI</p>
            <p className="truncate text-[11px] text-muted-foreground">Business OS</p>
          </div>
        )}
        {/* Collapse toggle — desktop only */}
        {onToggleCollapse && (
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-sidebar-accent",
                    collapsed && "border border-border/60"
                  )}
                  onClick={onToggleCollapse}
                  aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                  {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">{collapsed ? "Expand sidebar" : "Collapse"}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* New chat */}
      <div className={cn("shrink-0", collapsed ? "px-2 py-3" : "px-3 py-3")}>
        <Button
          className="w-full gap-2"
          onClick={() => navigate("chat")}
          size={collapsed ? "icon" : "default"}
        >
          <Plus className="h-4 w-4 shrink-0" />
          {!collapsed && <span>New Chat</span>}
        </Button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto scroll-thin px-3 pb-4">
        {navGroups.map((group, gi) => {
          const isAdminGroup = group.group === "Super Admin";
          return (
            <div key={group.group} className={cn(gi > 0 && "mt-5")}>
              {!collapsed && (
                <p
                  className={cn(
                    "mb-2 px-2.5 text-[10px] font-semibold uppercase tracking-wider",
                    isAdminGroup ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground/60"
                  )}
                >
                  {group.group}
                </p>
              )}
              {collapsed && isAdminGroup && <div className="my-3 border-t" />}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = activeModule === item.key;
                  const btn = (
                    <button
                      onClick={() => navigate(item.key)}
                      className={cn(
                        "group relative flex w-full items-center gap-3 rounded-lg text-sm font-medium transition-all",
                        collapsed ? "justify-center px-0 py-2.5" : "px-2.5 py-2",
                        active
                          ? isAdminGroup
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            : "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                      )}
                    >
                      {active && (
                        <span
                          className={cn(
                            "absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full",
                            isAdminGroup ? "bg-amber-500" : "bg-primary"
                          )}
                        />
                      )}
                      <Icon
                        className={cn(
                          "h-[18px] w-[18px] shrink-0 transition-colors",
                          active
                            ? isAdminGroup
                              ? "text-amber-500"
                              : "text-primary"
                            : "text-muted-foreground group-hover:text-sidebar-accent-foreground"
                        )}
                      />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                      {!collapsed && item.soon && (
                        <Badge variant="outline" className="ml-auto h-5 px-1.5 text-[10px] font-normal text-muted-foreground">
                          Soon
                        </Badge>
                      )}
                      {!collapsed && isAdminGroup && (
                        <Shield className="ml-auto h-3.5 w-3.5 text-amber-500/70" />
                      )}
                    </button>
                  );
                  if (!collapsed) return <div key={item.key}>{btn}</div>;
                  return (
                    <TooltipProvider key={item.key} delayDuration={100}>
                      <Tooltip>
                        <TooltipTrigger asChild>{btn}</TooltipTrigger>
                        <TooltipContent side="right">{item.label}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Footer: credits + profile */}
      {!collapsed ? (
        <div className="shrink-0 space-y-3 border-t p-3">
          <div className="rounded-xl border bg-card p-3">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Credits</span>
              <Badge variant="secondary" className="h-5 text-[10px]">{planLabel}</Badge>
            </div>
            <div className="mb-2 flex items-baseline gap-1">
              <span className="text-lg font-semibold tabular-nums">{credits.toLocaleString()}</span>
              <span className="text-xs text-muted-foreground">/ {planCredits.toLocaleString()}</span>
            </div>
            <Progress value={creditPct} className="h-1.5" />
          </div>

          <ProfileMenu
            user={user}
            initials={initials}
            theme={theme}
            onToggleTheme={() => setTheme(theme === "dark" ? "light" : "dark")}
            onNavigate={navigate}
          />
        </div>
      ) : (
        <div className="shrink-0 border-t p-3">
          <ProfileMenu
            user={user}
            initials={initials}
            theme={theme}
            onToggleTheme={() => setTheme(theme === "dark" ? "light" : "dark")}
            onNavigate={navigate}
            collapsed
          />
        </div>
      )}
    </>
  );
}

function ProfileMenu({
  user,
  initials,
  theme,
  onToggleTheme,
  onNavigate,
  collapsed = false,
}: {
  user: { name?: string; email?: string; plan?: string; isAdmin?: boolean } | undefined;
  initials: string;
  theme: string | undefined;
  onToggleTheme: () => void;
  onNavigate: (m: ModuleKey) => void;
  collapsed?: boolean;
}) {
  const handleLogout = () => {
    toast.success("Signed out (demo) — session preserved for preview.");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {collapsed ? (
          <button
            className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary transition-colors hover:bg-primary/25"
            aria-label="Account menu"
          >
            <span className="text-xs font-semibold">{initials}</span>
          </button>
        ) : (
          <button className="flex w-full items-center gap-2.5 rounded-lg px-1 py-1 text-left transition-colors hover:bg-sidebar-accent/60">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">{user?.name ?? "Loading…"}</p>
              <p className="truncate text-[11px] text-muted-foreground">{user?.email}</p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side={collapsed ? "right" : "top"} className="w-60" sideOffset={8}>
        <DropdownMenuLabel className="flex items-center gap-2.5 py-2.5">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user?.name ?? "User"}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onNavigate("settings")} className="gap-2.5 py-2">
          <UserIcon className="h-4 w-4 text-muted-foreground" />
          <span>Profile & account</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onNavigate("settings")} className="gap-2.5 py-2">
          <SettingsIcon className="h-4 w-4 text-muted-foreground" />
          <span>Settings</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onNavigate("billing")} className="gap-2.5 py-2">
          <CreditCard className="h-4 w-4 text-muted-foreground" />
          <span>Plans & credits</span>
        </DropdownMenuItem>
        {user?.isAdmin && (
          <DropdownMenuItem onClick={() => onNavigate("admin")} className="gap-2.5 py-2 text-amber-600 focus:text-amber-600 dark:text-amber-400">
            <Shield className="h-4 w-4" />
            <span>Super Admin</span>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onToggleTheme} className="gap-2.5 py-2">
          {theme === "dark" ? (
            <>
              <Sun className="h-4 w-4 text-muted-foreground" />
              <span>Light mode</span>
            </>
          ) : (
            <>
              <Moon className="h-4 w-4 text-muted-foreground" />
              <span>Dark mode</span>
            </>
          )}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="gap-2.5 py-2 text-destructive focus:text-destructive">
          <LogOut className="h-4 w-4" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
