"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import {
  MessageSquare,
  FileText,
  Image as ImageIcon,
  Sparkles,
  TrendingUp,
  ArrowUpRight,
  Zap,
  Clock,
  Bot,
  CreditCard,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useWorkspace } from "@/store/workspace";
import { PLANS, AGENTS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import { motion } from "framer-motion";

interface DashboardData {
  user: { id: string; name: string; plan: string; credits: number };
  counts: { chats: number; documents: number; images: number };
  series: { label: string; chat: number; image: number; document: number }[];
  creditsUsed: number;
  recent: {
    chats: { id: string; title: string; model: string; updatedAt: string; pinned: boolean }[];
    documents: { id: string; title: string; kind: string; updatedAt: string }[];
    images: { id: string; prompt: string; size: string; kind: string; createdAt: string }[];
    logs: { id: string; action: string; resource: string; createdAt: string }[];
  };
}

function timeAgo(iso: string) {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function DashboardView() {
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["dashboard"],
    queryFn: () => api<DashboardData>("/api/dashboard"),
  });
  const { setActiveModule } = useWorkspace();

  const plan = PLANS.find((p) => p.id === (data?.user.plan ?? "free")) ?? PLANS[0];
  const credits = data?.user.credits ?? 0;
  const creditPct = Math.min(100, Math.round((credits / plan.credits) * 100));
  const firstName = data?.user.name?.split(" ")[0] ?? "Founder";

  const stats = [
    { label: "Chats", value: data?.counts.chats ?? 0, icon: MessageSquare, color: "text-emerald-500", bg: "bg-emerald-500/10", action: () => setActiveModule("chat") },
    { label: "Docs", value: data?.counts.documents ?? 0, icon: FileText, color: "text-amber-500", bg: "bg-amber-500/10", action: () => setActiveModule("documents") },
    { label: "Images", value: data?.counts.images ?? 0, icon: ImageIcon, color: "text-rose-500", bg: "bg-rose-500/10", action: () => setActiveModule("images") },
    { label: "Credits", value: data?.creditsUsed ?? 0, icon: Zap, color: "text-teal-500", bg: "bg-teal-500/10", action: () => setActiveModule("billing") },
  ];

  const quickActions = [
    { title: "New Chat", desc: "Brainstorm & reason", icon: MessageSquare, module: "chat" as const, accent: "from-emerald-500 to-teal-500" },
    { title: "Write a Doc", desc: "Plans, contracts, emails", icon: FileText, module: "documents" as const, accent: "from-amber-500 to-orange-500" },
    { title: "Make Images", desc: "Logos, ads, thumbnails", icon: ImageIcon, module: "images" as const, accent: "from-rose-500 to-pink-500" },
    { title: "AI Agents", desc: "Specialised assistants", icon: Bot, module: "agents" as const, accent: "from-violet-500 to-fuchsia-500" },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-4 sm:py-6 md:px-6 md:py-8">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative mb-4 overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-teal-500/5 to-transparent p-5 sm:p-6 md:mb-6 md:p-8"
      >
        <div className="absolute inset-0 grid-bg opacity-40" />
        <div className="absolute -top-20 -right-10 h-48 w-48 rounded-full bg-primary/20 blur-3xl sm:h-56 sm:w-56" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="mb-1 text-xs font-medium text-muted-foreground sm:mb-1.5 sm:text-sm">
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </p>
            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl md:text-3xl">
              Welcome back, <span className="text-gradient">{firstName}</span>
            </h2>
            <p className="mt-1 max-w-md text-sm text-muted-foreground sm:mt-1.5">
              Your AI business OS is ready. Ship faster, automate more, run everything from one workspace.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button onClick={() => setActiveModule("chat")} className="gap-1.5 sm:gap-2" size="sm">
              <Sparkles className="h-4 w-4" /> <span className="sm:hidden">Create</span><span className="hidden sm:inline">Start creating</span>
            </Button>
            <Button variant="outline" onClick={() => setActiveModule("billing")} size="sm">
              <CreditCard className="mr-1.5 h-4 w-4" /> <span className="sm:hidden">Credits</span><span className="hidden sm:inline">Manage credits</span>
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Stats — 2 cols mobile, 4 cols desktop */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-4 md:gap-4">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.button
              key={s.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={s.action}
              className="text-left"
            >
              <Card className="group relative overflow-hidden p-3.5 transition-all hover:border-primary/40 hover:shadow-md sm:p-4 md:p-5">
                <div className="flex items-start justify-between">
                  <div className={cn("grid h-9 w-9 place-items-center rounded-xl sm:h-10 sm:w-10", s.bg)}>
                    <Icon className={cn("h-4 w-4 sm:h-5 sm:w-5", s.color)} />
                  </div>
                  <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/40 transition-all group-hover:text-primary sm:h-4 sm:w-4" />
                </div>
                <p className="mt-2.5 text-xl font-semibold tabular-nums sm:mt-3 sm:text-2xl md:text-3xl">
                  {(s.value ?? 0).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </Card>
            </motion.button>
          );
        })}
      </div>

      {/* Main grid — chart spans full width on mobile, 2/3 on desktop */}
      <div className="mt-3 grid gap-3 sm:mt-4 sm:gap-4 lg:grid-cols-3">
        {/* Activity chart */}
        <Card className="p-4 sm:p-5 md:col-span-2 md:p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold sm:text-base">Credit usage</h3>
              <p className="text-xs text-muted-foreground">Last 7 days</p>
            </div>
            <Badge variant="outline" className="gap-1.5">
              <TrendingUp className="h-3 w-3" /> Live
            </Badge>
          </div>
          <div className="h-[200px] w-full sm:h-[260px]">
            {isLoading ? (
              <div className="h-full w-full animate-pulse rounded-lg bg-muted" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.series ?? []} barGap={2} barCategoryGap="22%">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" width={24} />
                  <RTooltip
                    cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="chat" name="Chat" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="document" name="Docs" fill="var(--chart-3)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="image" name="Images" fill="var(--chart-4)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Credit widget */}
        <Card className="flex flex-col p-4 sm:p-5 md:p-6">
          <h3 className="text-sm font-semibold sm:text-base">Credit balance</h3>
          <p className="text-xs text-muted-foreground">{plan.name} plan</p>
          <div className="mt-3 flex items-baseline gap-1.5 sm:mt-4">
            <span className="text-3xl font-semibold tabular-nums sm:text-4xl">{credits.toLocaleString()}</span>
            <span className="text-sm text-muted-foreground">/ {plan.credits.toLocaleString()}</span>
          </div>
          <Progress value={creditPct} className="mt-2.5 h-2 sm:mt-3" />
          <p className="mt-2 text-xs text-muted-foreground">
            {creditPct > 20 ? `${creditPct}% used this cycle` : "Running low — top up to keep building"}
          </p>
          <div className="mt-auto flex flex-col gap-2 pt-4 sm:pt-5">
            <Button onClick={() => setActiveModule("billing")} className="w-full" size="sm">Upgrade plan</Button>
            <Button variant="outline" className="w-full" size="sm" onClick={() => setActiveModule("billing")}>
              Buy credit pack
            </Button>
          </div>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="mt-3 grid grid-cols-2 gap-2.5 sm:mt-4 sm:gap-3 lg:grid-cols-4">
        {quickActions.map((qa) => {
          const Icon = qa.icon;
          return (
            <button key={qa.title} onClick={() => setActiveModule(qa.module)} className="text-left">
              <Card className="group relative h-full overflow-hidden p-3.5 transition-all hover:-translate-y-0.5 hover:shadow-md sm:p-4 md:p-5">
                <div className={cn("mb-2.5 grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br text-white shadow-sm sm:mb-3 sm:h-10 sm:w-10", qa.accent)}>
                  <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <p className="text-sm font-medium">{qa.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{qa.desc}</p>
                <ArrowUpRight className="absolute right-3 top-3 h-3.5 w-3.5 text-muted-foreground/40 transition-all group-hover:text-primary sm:right-4 sm:top-4 sm:h-4 sm:w-4" />
              </Card>
            </button>
          );
        })}
      </div>

      {/* Recent activity + agents */}
      <div className="mt-3 grid gap-3 sm:mt-4 sm:gap-4 lg:grid-cols-3">
        <Card className="p-4 sm:p-5 md:col-span-2 md:p-6">
          <div className="mb-3 flex items-center justify-between sm:mb-4">
            <h3 className="text-sm font-semibold sm:text-base">Recent conversations</h3>
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setActiveModule("chat")}>
              View all
            </Button>
          </div>
          <div className="max-h-72 space-y-1 overflow-y-auto scroll-thin sm:max-h-80">
            {(data?.recent.chats ?? []).length === 0 ? (
              <EmptyHint icon={MessageSquare} text="No conversations yet — start your first chat" />
            ) : (
              data?.recent.chats.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActiveModule("chat")}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted"
                >
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{c.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{c.model}</p>
                  </div>
                  <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" /> <span className="hidden sm:inline">{timeAgo(c.updatedAt)}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        </Card>

        <Card className="p-4 sm:p-5 md:p-6">
          <h3 className="mb-3 text-sm font-semibold sm:mb-4 sm:text-base">Featured agents</h3>
          <div className="max-h-72 space-y-2 overflow-y-auto scroll-thin sm:max-h-80">
            {AGENTS.slice(0, 5).map((a) => (
              <button
                key={a.key}
                onClick={() => setActiveModule("agents")}
                className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-muted"
              >
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{a.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{a.description}</p>
                </div>
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function EmptyHint({ icon: Icon, text }: { icon: typeof MessageSquare; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
      <div className="grid h-10 w-10 place-items-center rounded-full bg-muted">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
