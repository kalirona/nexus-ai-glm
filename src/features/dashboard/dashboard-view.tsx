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
  Megaphone,
  Search,
  Youtube,
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

  const stats = [
    { label: "Conversations", value: data?.counts.chats ?? 0, icon: MessageSquare, color: "text-emerald-500", bg: "bg-emerald-500/10", action: () => setActiveModule("chat") },
    { label: "Documents", value: data?.counts.documents ?? 0, icon: FileText, color: "text-amber-500", bg: "bg-amber-500/10", action: () => setActiveModule("documents") },
    { label: "Images", value: data?.counts.images ?? 0, icon: ImageIcon, color: "text-rose-500", bg: "bg-rose-500/10", action: () => setActiveModule("images") },
    { label: "Credits used", value: data?.creditsUsed ?? 0, icon: Zap, color: "text-teal-500", bg: "bg-teal-500/10", action: () => setActiveModule("billing") },
  ];

  const quickActions = [
    { title: "New AI Chat", desc: "Brainstorm, write & reason across models", icon: MessageSquare, module: "chat" as const, accent: "from-emerald-500 to-teal-500" },
    { title: "Write a Document", desc: "Business plan, contract, email or blog", icon: FileText, module: "documents" as const, accent: "from-amber-500 to-orange-500" },
    { title: "Generate Images", desc: "Logos, ads, thumbnails & hero images", icon: ImageIcon, module: "images" as const, accent: "from-rose-500 to-pink-500" },
    { title: "Meet the Agents", desc: "Specialised AI assistants for every job", icon: Bot, module: "agents" as const, accent: "from-violet-500 to-fuchsia-500" },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative mb-6 overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-teal-500/5 to-transparent p-6 md:p-8"
      >
        <div className="absolute inset-0 grid-bg opacity-40" />
        <div className="absolute -top-20 -right-10 h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="mb-1.5 text-sm font-medium text-muted-foreground">
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </p>
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
              Welcome back, <span className="text-gradient">{data?.user.name?.split(" ")[0] ?? "Founder"}</span>
            </h2>
            <p className="mt-1 max-w-lg text-muted-foreground">
              Your AI business OS is ready. Ship faster, automate more, and run everything from one workspace.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="lg" onClick={() => setActiveModule("chat")} className="gap-2">
              <Sparkles className="h-4 w-4" /> Start creating
            </Button>
            <Button size="lg" variant="outline" onClick={() => setActiveModule("billing")}>
              <CreditCard className="mr-2 h-4 w-4" /> Manage credits
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
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
              <Card className="group relative overflow-hidden p-4 transition-all hover:border-primary/40 hover:shadow-md md:p-5">
                <div className="flex items-start justify-between">
                  <div className={cn("grid h-10 w-10 place-items-center rounded-xl", s.bg)}>
                    <Icon className={cn("h-5 w-5", s.color)} />
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground/40 transition-all group-hover:text-primary" />
                </div>
                <p className="mt-3 text-2xl font-semibold tabular-nums md:text-3xl">
                  {(s.value ?? 0).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </Card>
            </motion.button>
          );
        })}
      </div>

      {/* Main grid */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {/* Activity chart */}
        <Card className="lg:col-span-2 p-5 md:p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold">Credit usage</h3>
              <p className="text-xs text-muted-foreground">Last 7 days across modules</p>
            </div>
            <Badge variant="outline" className="gap-1.5">
              <TrendingUp className="h-3 w-3" /> Live
            </Badge>
          </div>
          <div className="h-[260px] w-full">
            {isLoading ? (
              <div className="h-full w-full animate-pulse rounded-lg bg-muted" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.series ?? []} barGap={2} barCategoryGap="22%">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" width={28} />
                  <RTooltip
                    cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="chat" name="Chat" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="document" name="Documents" fill="var(--chart-3)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="image" name="Images" fill="var(--chart-4)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Credit widget */}
        <Card className="flex flex-col p-5 md:p-6">
          <h3 className="text-base font-semibold">Credit balance</h3>
          <p className="text-xs text-muted-foreground">{plan.name} plan</p>
          <div className="mt-4 flex items-baseline gap-1.5">
            <span className="text-4xl font-semibold tabular-nums">{credits.toLocaleString()}</span>
            <span className="text-sm text-muted-foreground">/ {plan.credits.toLocaleString()}</span>
          </div>
          <Progress value={creditPct} className="mt-3 h-2" />
          <p className="mt-2 text-xs text-muted-foreground">
            {creditPct > 20 ? `${creditPct}% used this cycle` : "Running low — top up to keep building"}
          </p>
          <div className="mt-auto flex flex-col gap-2 pt-5">
            <Button onClick={() => setActiveModule("billing")} className="w-full">Upgrade plan</Button>
            <Button variant="outline" className="w-full" onClick={() => setActiveModule("images")}>
              Buy credit pack
            </Button>
          </div>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {quickActions.map((qa) => {
          const Icon = qa.icon;
          return (
            <button key={qa.title} onClick={() => setActiveModule(qa.module)} className="text-left">
              <Card className="group relative h-full overflow-hidden p-4 transition-all hover:-translate-y-0.5 hover:shadow-md md:p-5">
                <div className={cn("mb-3 grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br text-white shadow-sm", qa.accent)}>
                  <Icon className="h-5 w-5" />
                </div>
                <p className="font-medium">{qa.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{qa.desc}</p>
                <ArrowUpRight className="absolute right-4 top-4 h-4 w-4 text-muted-foreground/40 transition-all group-hover:text-primary" />
              </Card>
            </button>
          );
        })}
      </div>

      {/* Recent activity + agents */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 p-5 md:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold">Recent conversations</h3>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setActiveModule("chat")}>
              View all
            </Button>
          </div>
          <div className="space-y-1 max-h-80 overflow-y-auto scroll-thin">
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
                    <p className="text-xs text-muted-foreground">{c.model}</p>
                  </div>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" /> {timeAgo(c.updatedAt)}
                  </span>
                </button>
              ))
            )}
          </div>
        </Card>

        <Card className="p-5 md:p-6">
          <h3 className="mb-4 text-base font-semibold">Featured agents</h3>
          <div className="space-y-2 max-h-80 overflow-y-auto scroll-thin">
            {AGENTS.slice(0, 5).map((a) => (
              <button
                key={a.key}
                onClick={() => setActiveModule("agents")}
                className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-muted"
              >
                <div className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary")}>
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
