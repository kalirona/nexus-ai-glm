"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { AI_PROVIDERS } from "@/lib/constants";
import {
  Shield,
  Cpu,
  Lock,
  Gauge,
  Plus,
  Trash2,
  Check,
  X,
  Loader2,
  Sparkles,
  Crown,
  Zap,
  RefreshCw,
  Key,
  Eye,
  EyeOff,
  Activity,
  Server,
  Clock,
  Users,
  DollarSign,
  Search,
  Ban,
  Unlock,
  Star,
  TrendingUp,
  Settings as SettingsIcon,
  Link2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

type Section = "overview" | "users" | "models" | "security" | "performance" | "system";

const SECTIONS: { id: Section; label: string; icon: typeof Cpu; desc: string }[] = [
  { id: "overview", label: "Overview", icon: Activity, desc: "Platform metrics & usage" },
  { id: "users", label: "Users", icon: Users, desc: "Manage all platform users" },
  { id: "models", label: "AI Models", icon: Cpu, desc: "Provider key, base URL & models" },
  { id: "security", label: "Security", icon: Lock, desc: "Rate limits & access control" },
  { id: "performance", label: "Performance", icon: Gauge, desc: "Caching & concurrency" },
  { id: "system", label: "System", icon: SettingsIcon, desc: "Platform flags & audit log" },
];

interface PlatformSettings {
  providerId: string;
  providerKey: string;
  providerKeyMasked: string;
  baseUrl: string;
  enabledModels: string[];
  customModels: CustomModel[];
  apiKeys: ApiKeyConfig[];
  rateLimitPerMin: number;
  rateLimitPerDay: number;
  ipAllowlist: string;
  requireEmailVerification: boolean;
  autoSuspendAbuse: boolean;
  blockProxies: boolean;
  cacheEnabled: boolean;
  cacheTtlSeconds: number;
  maxConcurrentStreams: number;
  responseTimeoutSeconds: number;
  allowSignups: boolean;
  maintenanceMode: boolean;
  costPerChat: number;
  costPerImage: number;
  costPerDocument: number;
}

interface ModelInfo {
  id: string;
  name: string;
  description: string;
  badge: string;
  context: string;
  speed: string;
  enabled: boolean;
  kind?: "builtin" | "custom";
  baseUrl?: string;
  provider?: string;
  modelId?: string;
  apiKeyMasked?: string;
}

interface TestResult {
  id: string;
  name: string;
  available: boolean;
  latencyMs: number;
  error?: string;
}

interface CustomModel {
  id: string;
  name: string;
  modelId: string;
  baseUrl: string;
  apiKey: string;
  apiKeyMasked: string;
  provider: string;
  description?: string;
  context?: string;
  enabled: boolean;
}

interface ApiKeyConfig {
  id: string;
  label: string;
  role: "chat" | "image" | "all";
  provider: string;
  baseUrl: string;
  apiKey: string;
  apiKeyMasked: string;
  isDefault: boolean;
  createdAt: string;
}

interface AdminStats {
  totals: {
    users: number;
    activeUsers: number;
    suspendedUsers: number;
    proUsers: number;
    agencyUsers: number;
    starterUsers: number;
    chats: number;
    documents: number;
    images: number;
    creditsConsumed: number;
    estimatedMrr: number;
  };
  series: { label: string; credits: number }[];
  toolUsage?: { module: string; tool: string; count: number }[];
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  plan: string;
  credits: number;
  isAdmin: boolean;
  status: string;
  createdAt: string;
}

export function AdminView() {
  const [section, setSection] = useState<Section>("overview");

  return (
    <div className="mx-auto w-full max-w-5xl px-3 py-4 sm:px-4 sm:py-6 md:px-6 md:py-8">
      {/* Header */}
      <div className="mb-5 flex items-center gap-2">
        <h2 className="text-xl font-semibold tracking-tight md:text-2xl">Super Admin</h2>
        <Badge className="gap-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white">
          <Crown className="h-3 w-3" /> Platform
        </Badge>
      </div>

      {/* Admin warning */}
      <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3.5 py-2.5">
        <Shield className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
        <p className="text-xs text-amber-700 dark:text-amber-400">
          <span className="font-medium">Super Admin mode.</span> Changes here affect the entire platform, all users, and the AI provider. Proceed with caution.
        </p>
      </div>

      {/* Section tabs */}
      <div className="mb-5 grid grid-cols-3 gap-2 sm:grid-cols-6">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          const isActive = section === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-lg border px-2 py-2.5 text-xs font-medium transition-all sm:flex-row sm:justify-start sm:gap-2 sm:px-3",
                isActive
                  ? "border-primary bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">{s.label}</span>
              <span className="sm:hidden">{s.label}</span>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={section}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18 }}
        >
          {section === "overview" && <OverviewSection />}
          {section === "users" && <UsersSection />}
          {section === "models" && <ModelsSection />}
          {section === "security" && <SecuritySection />}
          {section === "performance" && <PerformanceSection />}
          {section === "system" && <SystemSection />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ===========================================================================
// OVERVIEW
// ===========================================================================
function OverviewSection() {
  const { data, isLoading } = useQuery<AdminStats>({
    queryKey: ["admin-stats"],
    queryFn: () => api<AdminStats>("/api/admin/stats"),
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="h-24 animate-pulse bg-muted/40" />
        ))}
      </div>
    );
  }

  const t = data?.totals;
  const stats = [
    { label: "Total users", value: t?.users ?? 0, icon: Users, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "Est. MRR", value: `$${(t?.estimatedMrr ?? 0).toLocaleString()}`, icon: DollarSign, color: "text-amber-500", bg: "bg-amber-500/10" },
    { label: "Active", value: t?.activeUsers ?? 0, icon: Activity, color: "text-teal-500", bg: "bg-teal-500/10" },
    { label: "Suspended", value: t?.suspendedUsers ?? 0, icon: Ban, color: "text-rose-500", bg: "bg-rose-500/10" },
    { label: "Pro plans", value: t?.proUsers ?? 0, icon: Star, color: "text-violet-500", bg: "bg-violet-500/10" },
    { label: "Agency plans", value: t?.agencyUsers ?? 0, icon: Crown, color: "text-sky-500", bg: "bg-sky-500/10" },
    { label: "Credits used", value: (t?.creditsConsumed ?? 0).toLocaleString(), icon: Zap, color: "text-orange-500", bg: "bg-orange-500/10" },
    { label: "Total chats", value: (t?.chats ?? 0).toLocaleString(), icon: Sparkles, color: "text-fuchsia-500", bg: "bg-fuchsia-500/10" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="p-3 sm:p-4">
              <div className={cn("mb-2 grid h-8 w-8 place-items-center rounded-lg", s.bg)}>
                <Icon className={cn("h-4 w-4", s.color)} />
              </div>
              <p className="text-lg font-semibold tabular-nums sm:text-xl">{s.value}</p>
              <p className="text-[11px] text-muted-foreground sm:text-xs">{s.label}</p>
            </Card>
          );
        })}
      </div>

      <Card className="p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Platform credit usage</h3>
            <p className="text-xs text-muted-foreground">Last 7 days</p>
          </div>
          <Badge variant="outline" className="gap-1.5">
            <TrendingUp className="h-3 w-3" /> Live
          </Badge>
        </div>
        <div className="flex h-40 items-end gap-1.5 sm:h-48">
          {(data?.series ?? []).map((d, i) => {
            const max = Math.max(...(data?.series ?? []).map((x) => x.credits), 1);
            const h = Math.max(4, (d.credits / max) * 100);
            return (
              <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                <div
                  className="w-full rounded-t-md bg-gradient-to-t from-primary/60 to-primary transition-all hover:from-primary hover:to-primary"
                  style={{ height: `${h}%` }}
                  title={`${d.credits} credits`}
                />
                <span className="text-[10px] text-muted-foreground">{d.label}</span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Tool usage insights — most used SEO/Marketing/YouTube generators */}
      <Card className="p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Generator usage</h3>
            <p className="text-xs text-muted-foreground">Top tools · last 30 days</p>
          </div>
          <Badge variant="outline" className="gap-1.5">
            <Activity className="h-3 w-3" /> {(data?.toolUsage ?? []).length} tools
          </Badge>
        </div>
        {(data?.toolUsage ?? []).length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-muted text-muted-foreground">
              <Sparkles className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium">No generator usage yet</p>
            <p className="max-w-sm text-xs text-muted-foreground">
              When users generate SEO, Marketing or YouTube content, the most popular tools will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {(data?.toolUsage ?? []).map((tool, i) => {
              const max = data?.toolUsage?.[0]?.count ?? 1;
              const pct = Math.max(2, (tool.count / max) * 100);
              const moduleColor =
                tool.module === "SEO" ? "from-amber-500 to-orange-500" :
                tool.module === "Marketing" ? "from-rose-500 to-pink-500" :
                tool.module === "YouTube" ? "from-red-500 to-rose-500" :
                "from-primary to-teal-500";
              return (
                <div key={`${tool.module}-${tool.tool}`} className="group">
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="grid h-5 w-5 place-items-center rounded-md bg-muted text-[9px] font-bold text-muted-foreground">
                        {i + 1}
                      </span>
                      <span className="font-medium">{tool.tool}</span>
                      <Badge variant="outline" className="text-[10px] py-0 h-4">{tool.module}</Badge>
                    </div>
                    <span className="tabular-nums text-muted-foreground">{tool.count} runs</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn("h-full rounded-full bg-gradient-to-r transition-all", moduleColor)}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

// ===========================================================================
// USERS
// ===========================================================================
function UsersSection() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);

  const { data: users = [] } = useQuery<AdminUser[]>({
    queryKey: ["admin-users", search, statusFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (statusFilter !== "all") params.set("status", statusFilter);
      return api<AdminUser[]>(`/api/admin/users?${params}`);
    },
  });

  const updateUser = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      api<AdminUser>(`/api/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      toast.success("User updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteUser = useMutation({
    mutationFn: (id: string) => api(`/api/admin/users/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      toast.success("User deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const statusColor: Record<string, string> = {
    active: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    suspended: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    banned: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  };

  if (showCreate) {
    return <UserCreateForm onClose={() => setShowCreate(false)} onSaved={() => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      setShowCreate(false);
    }} />;
  }

  if (editing) {
    return <UserEditForm user={editing} onClose={() => setEditing(null)} onSaved={() => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      setEditing(null);
    }} />;
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="pl-8"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="banned">Banned</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => setShowCreate(true)} className="gap-2 shrink-0" size="sm">
          <Plus className="h-4 w-4" /> New user
        </Button>
      </div>

      {/* User list */}
      <Card className="overflow-hidden">
        <div className="divide-y">
          {users.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
              <Users className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No users found.</p>
            </div>
          ) : (
            users.map((u) => (
              <div key={u.id} className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:gap-4 sm:p-4">
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarFallback className={cn("text-xs font-semibold", u.isAdmin ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" : "bg-primary/15 text-primary")}>
                      {u.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-sm font-medium">{u.name}</p>
                      {u.isAdmin && <Crown className="h-3 w-3 shrink-0 text-amber-500" />}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2">
                  <Badge variant="outline" className="text-[10px] capitalize">{u.plan}</Badge>
                  <span className={cn("rounded-md px-1.5 py-0.5 text-[10px] font-medium capitalize", statusColor[u.status] ?? "bg-muted text-muted-foreground")}>
                    {u.status}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{u.credits.toLocaleString()} cr</span>
                </div>

                <div className="flex items-center gap-1 sm:ml-auto">
                  <Select value={u.plan} onValueChange={(plan) => updateUser.mutate({ id: u.id, body: { plan } })}>
                    <SelectTrigger className="h-7 w-[90px] text-[11px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="starter">Starter</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                      <SelectItem value="agency">Agency</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1 px-2 text-[11px]"
                    onClick={() => {
                      updateUser.mutate({ id: u.id, body: { grantCredits: 1000 } });
                      toast.success(`Granted 1,000 credits to ${u.name}`);
                    }}
                    title="Grant 1,000 credits"
                  >
                    <Zap className="h-3 w-3" /> +1k
                  </Button>
                  {u.status === "active" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1 px-2 text-[11px] text-amber-600 hover:bg-amber-500/10 dark:text-amber-400"
                      onClick={() => updateUser.mutate({ id: u.id, body: { status: "suspended" } })}
                      title="Suspend user"
                    >
                      <Ban className="h-3 w-3" />
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1 px-2 text-[11px] text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400"
                      onClick={() => updateUser.mutate({ id: u.id, body: { status: "active" } })}
                      title="Activate user"
                    >
                      <Unlock className="h-3 w-3" />
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1 px-2 text-[11px]"
                    onClick={() => setEditing(u)}
                    title="Edit user"
                  >
                    <SettingsIcon className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1 px-2 text-[11px] text-rose-600 hover:bg-rose-500/10 dark:text-rose-400"
                    onClick={() => {
                      if (confirm(`Delete ${u.name}? This permanently removes the account and all their data.`)) {
                        deleteUser.mutate(u.id);
                      }
                    }}
                    title="Delete user"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
      <p className="text-center text-xs text-muted-foreground">
        Showing {users.length} user{users.length !== 1 ? "s" : ""} · actions are logged in the audit trail
      </p>
    </div>
  );
}

function UserCreateForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ name: "", email: "", plan: "free", credits: 200, isAdmin: false });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      toast.error("Name and email are required");
      return;
    }
    setSaving(true);
    try {
      await api("/api/admin/users", { method: "POST", body: JSON.stringify(form) });
      toast.success("User created");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Create failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-4 sm:p-5">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold sm:text-base">Create new user</h3>
          <p className="text-xs text-muted-foreground">Add a new account to the platform.</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>Back</Button>
      </div>
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Full name *</Label>
            <Input value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} placeholder="Jane Doe" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Email *</Label>
            <Input value={form.email} onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))} placeholder="jane@example.com" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Plan</Label>
            <Select value={form.plan} onValueChange={(v) => setForm((s) => ({ ...s, plan: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="starter">Starter</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="agency">Agency</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Starting credits</Label>
            <Input type="number" value={form.credits} onChange={(e) => setForm((s) => ({ ...s, credits: Number(e.target.value) }))} />
          </div>
        </div>
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="text-sm font-medium">Super admin access</p>
            <p className="text-xs text-muted-foreground">Grant platform admin privileges</p>
          </div>
          <Switch checked={form.isAdmin} onCheckedChange={(v) => setForm((s) => ({ ...s, isAdmin: v }))} />
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={save} disabled={saving} size="sm" className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Create user
        </Button>
      </div>
    </Card>
  );
}

function UserEditForm({ user, onClose, onSaved }: { user: AdminUser; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: user.name,
    email: user.email,
    plan: user.plan,
    status: user.status,
    setCredits: user.credits,
    isAdmin: user.isAdmin,
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await api(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          plan: form.plan,
          status: form.status,
          setCredits: form.setCredits,
          isAdmin: form.isAdmin,
        }),
      });
      toast.success("User updated");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-4 sm:p-5">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold sm:text-base">Edit {user.name}</h3>
          <p className="text-xs text-muted-foreground">{user.email}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>Back</Button>
      </div>
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Full name</Label>
            <Input value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Email</Label>
            <Input value={form.email} onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))} />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Plan</Label>
            <Select value={form.plan} onValueChange={(v) => setForm((s) => ({ ...s, plan: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="starter">Starter</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="agency">Agency</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm((s) => ({ ...s, status: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="banned">Banned</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Credit balance</Label>
          <Input type="number" value={form.setCredits} onChange={(e) => setForm((s) => ({ ...s, setCredits: Number(e.target.value) }))} />
        </div>
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="text-sm font-medium">Super admin access</p>
            <p className="text-xs text-muted-foreground">Grant platform admin privileges</p>
          </div>
          <Switch checked={form.isAdmin} onCheckedChange={(v) => setForm((s) => ({ ...s, isAdmin: v }))} />
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={save} disabled={saving} size="sm" className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Save changes
        </Button>
      </div>
    </Card>
  );
}

// ===========================================================================
// AI MODELS — provider selection, API key, test connection, custom models
// ===========================================================================
function ModelsSection() {
  const qc = useQueryClient();
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[] | null>(null);
  const [allowedModels, setAllowedModels] = useState<string[] | null>(null);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [editingCustom, setEditingCustom] = useState<CustomModel | null>(null);
  const [perModelTest, setPerModelTest] = useState<Record<string, TestResult>>({});
  const [showKeyForm, setShowKeyForm] = useState(false);
  const [editingKey, setEditingKey] = useState<ApiKeyConfig | null>(null);

  const { data: settings } = useQuery<PlatformSettings>({
    queryKey: ["admin-settings"],
    queryFn: () => api<PlatformSettings>("/api/admin/settings"),
  });

  const { data: modelsData } = useQuery<{ models: ModelInfo[] }>({
    queryKey: ["admin-models"],
    queryFn: () => api("/api/admin/models"),
  });

  const selectedProvider = AI_PROVIDERS.find((p) => p.id === (settings?.providerId ?? "zai"));

  // ---- Provider + key save ----
  const saveProvider = useMutation({
    mutationFn: (providerId: string) =>
      api("/api/admin/settings", { method: "PATCH", body: JSON.stringify({ providerId }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
      toast.success("Provider switched — base URL updated");
    },
  });

  const saveKey = useMutation({
    mutationFn: () =>
      api("/api/admin/settings", { method: "PATCH", body: JSON.stringify({ providerKey: apiKey }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
      setApiKey("");
      toast.success("API key saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveBaseUrl = useMutation({
    mutationFn: (baseUrl: string) =>
      api("/api/admin/settings", { method: "PATCH", body: JSON.stringify({ baseUrl }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
      toast.success("Base URL saved");
    },
  });

  // ---- Test all built-in models ----
  const testConnection = async () => {
    setTesting(true);
    setTestResults(null);
    setAllowedModels(null);
    try {
      const res = await api<{
        results: TestResult[];
        allowed: string[];
        availableCount: number;
        total: number;
        invalidKey?: boolean;
      }>("/api/admin/models/test", {
        method: "POST",
        body: JSON.stringify({ apiKey: apiKey || undefined }),
      });
      setTestResults(res.results);
      setAllowedModels(res.allowed);

      if (res.invalidKey) {
        toast.error("Invalid API key — all models rejected (401). Check your key and try again.");
      } else if (res.availableCount === 0) {
        toast.error("Connection failed — no models available. Check the base URL and network.");
      } else {
        await api("/api/admin/settings", { method: "PATCH", body: JSON.stringify({ enabledModels: res.allowed }) });
        qc.invalidateQueries({ queryKey: ["admin-models"] });
        qc.invalidateQueries({ queryKey: ["admin-settings"] });
        toast.success(`Connection OK — ${res.availableCount} of ${res.total} models available`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Connection failed");
    } finally {
      setTesting(false);
    }
  };

  // ---- Test a single custom model ----
  const testSingleModel = async (model: { id: string; name: string; modelId?: string; baseUrl?: string; kind?: string }) => {
    setPerModelTest((s) => ({ ...s, [model.id]: { id: model.id, name: model.name, available: false, latencyMs: 0, error: "Testing…" } }));
    try {
      const res = await api<{ results: TestResult[]; invalidKey?: boolean }>("/api/admin/models/test", {
        method: "POST",
        body: JSON.stringify({ modelId: model.id }),
      });
      const result = res.results[0];
      if (result) {
        setPerModelTest((s) => ({ ...s, [model.id]: result }));
        if (result.available) {
          toast.success(`${model.name}: OK (${result.latencyMs}ms)`);
        } else {
          toast.error(`${model.name}: ${result.error || "failed"}`);
        }
      }
    } catch (e) {
      setPerModelTest((s) => ({ ...s, [model.id]: { id: model.id, name: model.name, available: false, latencyMs: 0, error: e instanceof Error ? e.message : "failed" } }));
      toast.error(e instanceof Error ? e.message : "Test failed");
    }
  };

  // ---- Toggle model ----
  const toggleModel = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => {
      const current = settings?.enabledModels ?? [];
      const next = enabled ? [...current, id] : current.filter((m) => m !== id);
      return api("/api/admin/settings", { method: "PATCH", body: JSON.stringify({ enabledModels: next }) });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-models"] });
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
    },
  });

  // ---- Custom model CRUD ----
  const saveCustomModels = useMutation({
    mutationFn: (models: CustomModel[]) =>
      api("/api/admin/settings", { method: "PATCH", body: JSON.stringify({ customModels: models }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
      qc.invalidateQueries({ queryKey: ["admin-models"] });
    },
  });

  const deleteCustomModel = (id: string) => {
    const current = settings?.customModels ?? [];
    saveCustomModels.mutate(current.filter((m) => m.id !== id));
    toast.success("Custom model deleted");
  };

  // ---- API Keys CRUD ----
  const saveApiKeys = useMutation({
    mutationFn: (keys: ApiKeyConfig[]) =>
      api("/api/admin/settings", { method: "PATCH", body: JSON.stringify({ apiKeys: keys }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
    },
  });

  const deleteApiKey = (id: string) => {
    const current = settings?.apiKeys ?? [];
    saveApiKeys.mutate(current.filter((k) => k.id !== id));
    toast.success("API key deleted");
  };

  const setDefaultKey = (id: string, role: string) => {
    const current = settings?.apiKeys ?? [];
    // Unset other defaults for the same role scope
    const next = current.map((k) => {
      if (k.id === id) return { ...k, isDefault: !k.isDefault };
      // If turning on a default for this role, demote others with the same role or "all"
      if (k.isDefault && (k.role === role || k.role === "all" || role === "all")) {
        return { ...k, isDefault: false };
      }
      return k;
    });
    saveApiKeys.mutate(next);
  };

  const builtinModels = (modelsData?.models ?? []).filter((m) => m.kind !== "custom");
  const customModels = (modelsData?.models ?? []).filter((m) => m.kind === "custom");

  if (showKeyForm || editingKey) {
    return (
      <ApiKeyForm
        existing={editingKey}
        onClose={() => { setShowKeyForm(false); setEditingKey(null); }}
        onSave={(keyConfig) => {
          const current = settings?.apiKeys ?? [];
          const idx = current.findIndex((k) => k.id === keyConfig.id);
          // If setting as default, demote others with the same role
          let next = current;
          if (keyConfig.isDefault) {
            next = next.map((k) => {
              if (k.id === keyConfig.id) return keyConfig;
              if (k.isDefault && (k.role === keyConfig.role || k.role === "all" || keyConfig.role === "all")) {
                return { ...k, isDefault: false };
              }
              return k;
            });
          } else {
            next = idx >= 0 ? next.map((k) => (k.id === keyConfig.id ? keyConfig : k)) : [...next, keyConfig];
          }
          saveApiKeys.mutate(next, { onSuccess: () => toast.success(editingKey ? "API key updated" : "API key added") });
          setShowKeyForm(false);
          setEditingKey(null);
        }}
      />
    );
  }

  if (showCustomForm || editingCustom) {
    return (
      <CustomModelForm
        existing={editingCustom}
        onClose={() => { setShowCustomForm(false); setEditingCustom(null); }}
        onSave={(model) => {
          const current = settings?.customModels ?? [];
          const idx = current.findIndex((m) => m.id === model.id);
          const next = idx >= 0 ? current.map((m) => (m.id === model.id ? model : m)) : [...current, model];
          saveCustomModels.mutate(next, { onSuccess: () => toast.success(editingCustom ? "Custom model updated" : "Custom model added") });
          setShowCustomForm(false);
          setEditingCustom(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Provider selection + API key */}
      <Card className="p-4 sm:p-5">
        <div className="mb-1 flex items-center gap-2">
          <Key className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold sm:text-base">AI Provider Configuration</h3>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">
          Select a provider to auto-configure the base URL, then enter your API key. Test the connection to pull available models.
        </p>

        {/* Provider selector */}
        <div className="mb-4 space-y-1.5">
          <Label className="text-xs text-muted-foreground">Provider</Label>
          <Select
            value={settings?.providerId ?? "zai"}
            onValueChange={(v) => saveProvider.mutate(v)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AI_PROVIDERS.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  <div className="flex flex-col">
                    <span className="font-medium">{p.name}</span>
                    <span className="text-[10px] text-muted-foreground">{p.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Base URL — auto-filled, editable for custom */}
        <div className="mb-3 space-y-1.5">
          <Label className="text-xs text-muted-foreground">
            Base URL {settings?.providerId === "custom" && "(required)"}
          </Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Link2 className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={settings?.baseUrl ?? ""}
                onChange={(e) => saveBaseUrl.mutate(e.target.value)}
                placeholder="https://api.example.com/v1"
                className="pl-8 font-mono text-xs"
              />
            </div>
          </div>
        </div>

        {/* API key */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{selectedProvider?.keyLabel ?? "API Key"}</Label>
          {settings?.providerKeyMasked && (
            <div className="mb-2 flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2">
              <Check className="h-4 w-4 text-emerald-500" />
              <span className="text-xs text-muted-foreground">Current key:</span>
              <code className="text-xs font-mono">{settings.providerKeyMasked}</code>
            </div>
          )}
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={selectedProvider?.keyPlaceholder ?? "Paste your API key…"}
                className="pr-10"
              />
              <button
                onClick={() => setShowKey((s) => !s)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showKey ? "Hide key" : "Show key"}
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <Button
              onClick={() => saveKey.mutate()}
              disabled={!apiKey.trim() || saveKey.isPending}
              variant="outline"
              className="gap-2 shrink-0"
              size="sm"
            >
              {saveKey.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Save key
            </Button>
            <Button
              onClick={testConnection}
              disabled={testing}
              className="gap-2 shrink-0"
              size="sm"
            >
              {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {testing ? "Testing…" : "Test & pull"}
            </Button>
          </div>
          {selectedProvider?.docsUrl && (
            <p className="pt-1 text-[11px] text-muted-foreground">
              Get your API key from{" "}
              <a href={selectedProvider.docsUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                {selectedProvider.name} ↗
              </a>
            </p>
          )}
        </div>

        {/* Test results */}
        {testResults && (
          <div className="mt-4 space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">
              Results — {testResults.filter((r) => r.available).length} available of {testResults.length} tested
            </p>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {testResults.map((r) => (
                <div
                  key={r.id}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs",
                    r.available ? "border-emerald-500/30 bg-emerald-500/5" : "border-rose-500/30 bg-rose-500/5"
                  )}
                >
                  {r.available ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <X className="h-3.5 w-3.5 text-rose-500" />}
                  <span className="flex-1 truncate font-medium">{r.name}</span>
                  {r.available ? <span className="text-muted-foreground">{r.latencyMs}ms</span> : <span className="truncate text-rose-400" title={r.error}>{r.error?.slice(0, 30)}</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* API Keys manager — assign keys to chat / image roles */}
      <Card className="p-4 sm:p-5">
        <div className="mb-1 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Key className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold sm:text-base">API Keys</h3>
            <Badge variant="outline" className="text-[10px]">{settings?.apiKeys?.length ?? 0}</Badge>
          </div>
          <Button onClick={() => setShowKeyForm(true)} size="sm" className="gap-2">
            <Plus className="h-4 w-4" /> Add key
          </Button>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">
          Manage API keys and assign them to roles. The default key for each role (chat or image) is used automatically. Use different keys for chat vs images to control costs and routing.
        </p>

        {(settings?.apiKeys?.length ?? 0) === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-muted">
              <Key className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No API keys yet. Add one and assign it to chat, image, or both.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {settings?.apiKeys?.map((k) => (
              <div key={k.id} className={cn("flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center", k.isDefault ? "border-primary/40 bg-primary/5" : "bg-card")}>
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg", k.role === "image" ? "bg-rose-500/10 text-rose-500" : k.role === "all" ? "bg-violet-500/10 text-violet-500" : "bg-emerald-500/10 text-emerald-500")}>
                    <Key className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium">{k.label}</p>
                      <Badge variant="outline" className="text-[10px] capitalize">{k.role}</Badge>
                      <Badge variant="outline" className="text-[10px] capitalize">{k.provider}</Badge>
                      {k.isDefault && <Badge className="text-[10px] gap-1"><Star className="h-2.5 w-2.5" /> Default</Badge>}
                    </div>
                    <p className="truncate text-xs text-muted-foreground font-mono">{k.baseUrl}</p>
                    {k.apiKeyMasked && <p className="truncate text-[10px] text-muted-foreground/70">key: {k.apiKeyMasked}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-1 sm:ml-auto">
                  <Button variant="outline" size="sm" className="h-7 px-2 text-[11px]" onClick={() => setDefaultKey(k.id, k.role)} title="Toggle default for role">
                    <Star className={cn("h-3 w-3", k.isDefault && "fill-primary text-primary")} />
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 px-2 text-[11px]" onClick={() => setEditingKey(k)} title="Edit key">
                    <SettingsIcon className="h-3 w-3" />
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 px-2 text-[11px] text-rose-600 hover:bg-rose-500/10 dark:text-rose-400" onClick={() => deleteApiKey(k.id)} title="Delete key">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Built-in model catalog */}
      <Card className="p-4 sm:p-5">
        <div className="mb-1 flex items-center gap-2">
          <Cpu className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold sm:text-base">Model catalog</h3>
          <Badge variant="outline" className="ml-auto text-[10px]">{builtinModels.length} built-in</Badge>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">Enable or disable models available to users.</p>
        <div className="space-y-2">
          {builtinModels.map((m) => (
            <div key={m.id} className={cn("flex items-center gap-3 rounded-lg border p-3 transition-colors", m.enabled ? "bg-card" : "bg-muted/20 opacity-70")}>
              <div className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg", m.enabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium">{m.name}</p>
                  <Badge variant="outline" className="text-[10px]">{m.badge}</Badge>
                </div>
                <p className="truncate text-xs text-muted-foreground">{m.description} · {m.context}</p>
              </div>
              <Switch checked={m.enabled} onCheckedChange={(v) => toggleModel.mutate({ id: m.id, enabled: v })} aria-label={`Toggle ${m.name}`} />
            </div>
          ))}
        </div>
      </Card>

      {/* Custom models */}
      <Card className="p-4 sm:p-5">
        <div className="mb-1 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold sm:text-base">Custom models</h3>
            <Badge variant="outline" className="text-[10px]">{customModels.length}</Badge>
          </div>
          <Button onClick={() => setShowCustomForm(true)} size="sm" className="gap-2">
            <Plus className="h-4 w-4" /> Add model
          </Button>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">
          Add custom OpenAI-compatible models with their own endpoint, API key and model ID. Each model can be tested independently.
        </p>

        {customModels.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-muted">
              <Cpu className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No custom models yet. Add one to use any OpenAI-compatible endpoint.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {customModels.map((m) => {
              const test = perModelTest[m.id];
              return (
                <div key={m.id} className={cn("flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center", m.enabled ? "bg-card" : "bg-muted/20 opacity-70")}>
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg", m.enabled ? "bg-violet-500/10 text-violet-500" : "bg-muted text-muted-foreground")}>
                      <Cpu className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium">{m.name}</p>
                        <Badge variant="outline" className="text-[10px] capitalize">{m.provider}</Badge>
                        {test && (
                          <Badge className={cn("text-[10px]", test.available ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/15 text-rose-600 dark:text-rose-400")}>
                            {test.available ? `${test.latencyMs}ms` : "fail"}
                          </Badge>
                        )}
                      </div>
                      <p className="truncate text-xs text-muted-foreground font-mono">{m.modelId}</p>
                      <p className="truncate text-[10px] text-muted-foreground/70 font-mono">{m.baseUrl}</p>
                      {m.apiKeyMasked && <p className="truncate text-[10px] text-muted-foreground/70">key: {m.apiKeyMasked}</p>}
                      {test?.error && test.error !== "Testing…" && <p className="truncate text-[10px] text-rose-400">{test.error}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 sm:ml-auto">
                    <Button variant="outline" size="sm" className="h-7 gap-1 px-2 text-[11px]" onClick={() => testSingleModel(m)} disabled={perModelTest[m.id]?.error === "Testing…"}>
                      {perModelTest[m.id]?.error === "Testing…" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
                      Test
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 px-2 text-[11px]" onClick={() => {
                      const cm = settings?.customModels?.find((x) => x.id === m.id);
                      if (cm) setEditingCustom(cm);
                    }}>
                      <SettingsIcon className="h-3 w-3" />
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 px-2 text-[11px] text-rose-600 hover:bg-rose-500/10 dark:text-rose-400" onClick={() => deleteCustomModel(m.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                    <Switch
                      checked={m.enabled}
                      onCheckedChange={(v) => {
                        // Toggle by updating the customModels array
                        const current = settings?.customModels ?? [];
                        const next = current.map((x) => (x.id === m.id ? { ...x, enabled: v } : x));
                        saveCustomModels.mutate(next);
                      }}
                      aria-label={`Toggle ${m.name}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

// ---- API key add/edit form ----
function ApiKeyForm({
  existing,
  onClose,
  onSave,
}: {
  existing: ApiKeyConfig | null;
  onClose: () => void;
  onSave: (key: ApiKeyConfig) => void;
}) {
  const [form, setForm] = useState({
    id: existing?.id ?? "",
    label: existing?.label ?? "",
    role: existing?.role ?? "all",
    provider: existing?.provider ?? "zai",
    baseUrl: existing?.baseUrl ?? "https://api.z.ai/api/paas/v4",
    apiKey: "",
    isDefault: existing?.isDefault ?? false,
  });
  const [showKey, setShowKey] = useState(false);

  const onProviderChange = (providerId: string) => {
    const provider = AI_PROVIDERS.find((p) => p.id === providerId);
    setForm((s) => ({
      ...s,
      provider: providerId,
      baseUrl: provider?.baseUrl || s.baseUrl,
    }));
  };

  const save = () => {
    if (!form.label.trim()) {
      toast.error("Label is required");
      return;
    }
    onSave({
      ...form,
      id: form.id || `key-${Date.now()}`,
      apiKey: form.apiKey, // empty = keep existing (backend preserves)
      apiKeyMasked: form.apiKey ? form.apiKey.slice(0, 6) + "••••••••" + form.apiKey.slice(-4) : existing?.apiKeyMasked ?? "",
      createdAt: existing?.createdAt || new Date().toISOString(),
    });
  };

  return (
    <Card className="p-4 sm:p-5">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold sm:text-base">{existing ? "Edit API key" : "Add API key"}</h3>
          <p className="text-xs text-muted-foreground">Assign a key to chat, image, or both roles.</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>Back</Button>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Label *</Label>
          <Input value={form.label} onChange={(e) => setForm((s) => ({ ...s, label: e.target.value }))} placeholder="e.g. Z.ai Chat Key, OpenAI Image Key" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Role</Label>
            <Select value={form.role} onValueChange={(v) => setForm((s) => ({ ...s, role: v as ApiKeyConfig["role"] }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All (chat + image)</SelectItem>
                <SelectItem value="chat">Chat only</SelectItem>
                <SelectItem value="image">Image only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Provider</Label>
            <Select value={form.provider} onValueChange={onProviderChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {AI_PROVIDERS.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Base URL</Label>
          <div className="relative">
            <Link2 className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={form.baseUrl} onChange={(e) => setForm((s) => ({ ...s, baseUrl: e.target.value }))} placeholder="https://api.example.com/v1" className="pl-8 font-mono text-xs" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">
            API Key {existing?.apiKeyMasked && <span className="text-muted-foreground/60">(current: {existing.apiKeyMasked} — leave blank to keep)</span>}
          </Label>
          <div className="relative">
            <Input
              type={showKey ? "text" : "password"}
              value={form.apiKey}
              onChange={(e) => setForm((s) => ({ ...s, apiKey: e.target.value }))}
              placeholder="Enter API key…"
              className="pr-10"
            />
            <button onClick={() => setShowKey((s) => !s)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label={showKey ? "Hide" : "Show"}>
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="text-sm font-medium">Set as default for this role</p>
            <p className="text-xs text-muted-foreground">The default key is used automatically for all {form.role === "all" ? "chat and image" : form.role} requests</p>
          </div>
          <Switch checked={form.isDefault} onCheckedChange={(v) => setForm((s) => ({ ...s, isDefault: v }))} />
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={save} size="sm" className="gap-2">
          <Check className="h-4 w-4" />
          {existing ? "Save changes" : "Add key"}
        </Button>
      </div>
    </Card>
  );
}

// ---- Custom model add/edit form ----
function CustomModelForm({
  existing,
  onClose,
  onSave,
}: {
  existing: CustomModel | null;
  onClose: () => void;
  onSave: (model: CustomModel) => void;
}) {
  const [form, setForm] = useState({
    id: existing?.id ?? "",
    name: existing?.name ?? "",
    modelId: existing?.modelId ?? "",
    baseUrl: existing?.baseUrl ?? "",
    apiKey: "", // raw key only entered on create/edit
    provider: existing?.provider ?? "custom",
    description: existing?.description ?? "",
    context: existing?.context ?? "",
    enabled: existing?.enabled ?? true,
  });
  const [showKey, setShowKey] = useState(false);

  const save = () => {
    if (!form.name.trim() || !form.modelId.trim() || !form.baseUrl.trim()) {
      toast.error("Name, model ID and base URL are required");
      return;
    }
    onSave({
      ...form,
      id: form.id || `custom-${Date.now()}`,
      apiKey: form.apiKey, // empty = keep existing (backend preserves)
      apiKeyMasked: form.apiKey ? form.apiKey.slice(0, 6) + "••••••••" + form.apiKey.slice(-4) : existing?.apiKeyMasked ?? "",
    });
  };

  return (
    <Card className="p-4 sm:p-5">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold sm:text-base">{existing ? "Edit custom model" : "Add custom model"}</h3>
          <p className="text-xs text-muted-foreground">Configure an OpenAI-compatible model with its own endpoint and key.</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>Back</Button>
      </div>

      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Display name *</Label>
            <Input value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} placeholder="e.g. GPT-4o" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Model ID * <span className="text-muted-foreground/60">(sent to provider)</span></Label>
            <Input value={form.modelId} onChange={(e) => setForm((s) => ({ ...s, modelId: e.target.value }))} placeholder="e.g. gpt-4o, anthropic/claude-3.5-sonnet" className="font-mono text-xs" />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Base URL *</Label>
            <div className="relative">
              <Link2 className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={form.baseUrl} onChange={(e) => setForm((s) => ({ ...s, baseUrl: e.target.value }))} placeholder="https://api.openai.com/v1" className="pl-8 font-mono text-xs" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Provider</Label>
            <Select value={form.provider} onValueChange={(v) => setForm((s) => ({ ...s, provider: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {AI_PROVIDERS.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">
            API Key {existing?.apiKeyMasked && <span className="text-muted-foreground/60">(current: {existing.apiKeyMasked} — leave blank to keep)</span>}
          </Label>
          <div className="relative">
            <Input
              type={showKey ? "text" : "password"}
              value={form.apiKey}
              onChange={(e) => setForm((s) => ({ ...s, apiKey: e.target.value }))}
              placeholder="Enter API key for this model…"
              className="pr-10"
            />
            <button onClick={() => setShowKey((s) => !s)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label={showKey ? "Hide" : "Show"}>
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Description (optional)</Label>
            <Input value={form.description} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} placeholder="e.g. Fast multimodal model" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Context window (optional)</Label>
            <Input value={form.context} onChange={(e) => setForm((s) => ({ ...s, context: e.target.value }))} placeholder="e.g. 128K" />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="text-sm font-medium">Enabled</p>
            <p className="text-xs text-muted-foreground">Make this model available to users</p>
          </div>
          <Switch checked={form.enabled} onCheckedChange={(v) => setForm((s) => ({ ...s, enabled: v }))} />
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={save} size="sm" className="gap-2">
          <Check className="h-4 w-4" />
          {existing ? "Save changes" : "Add model"}
        </Button>
      </div>
    </Card>
  );
}

// ===========================================================================
// SECURITY
// ===========================================================================
function SecuritySection() {
  const qc = useQueryClient();
  const { data: settings } = useQuery<PlatformSettings>({
    queryKey: ["admin-settings"],
    queryFn: () => api<PlatformSettings>("/api/admin/settings"),
  });

  const [form, setForm] = useState<Partial<PlatformSettings>>({});
  const [saving, setSaving] = useState(false);

  const merged = { ...settings, ...form } as PlatformSettings;

  const save = async () => {
    setSaving(true);
    try {
      await api("/api/admin/settings", { method: "PATCH", body: JSON.stringify(form) });
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
      setForm({});
      toast.success("Security settings saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const num = (key: keyof PlatformSettings) => ({
    value: merged[key] as number,
    onChange: (v: number) => setForm((s) => ({ ...s, [key]: v })),
  });
  const bool = (key: keyof PlatformSettings) => ({
    checked: merged[key] as boolean,
    onCheckedChange: (v: boolean) => setForm((s) => ({ ...s, [key]: v })),
  });
  const str = (key: keyof PlatformSettings) => ({
    value: merged[key] as string,
    onChange: (v: string) => setForm((s) => ({ ...s, [key]: v })),
  });

  return (
    <div className="space-y-4">
      <Card className="p-4 sm:p-5">
        <div className="mb-1 flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-500" />
          <h3 className="text-sm font-semibold sm:text-base">Rate limiting</h3>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">Protect the platform from abuse and keep the backend healthy.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Requests per minute (per user)</Label>
            <Input
              type="number"
              {...num("rateLimitPerMin")}
              onChange={(e) => num("rateLimitPerMin").onChange(Number(e.target.value))}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Requests per day (per user)</Label>
            <Input
              type="number"
              {...num("rateLimitPerDay")}
              onChange={(e) => num("rateLimitPerDay").onChange(Number(e.target.value))}
            />
          </div>
        </div>
      </Card>

      <Card className="p-4 sm:p-5">
        <div className="mb-1 flex items-center gap-2">
          <Lock className="h-4 w-4 text-rose-500" />
          <h3 className="text-sm font-semibold sm:text-base">Access control</h3>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">Restrict who can access the platform.</p>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">IP allowlist (comma-separated, leave empty for all)</Label>
            <Input
              {...str("ipAllowlist")}
              onChange={(e) => str("ipAllowlist").onChange(e.target.value)}
              placeholder="192.168.1.1, 10.0.0.0/24"
            />
          </div>
          <Separator />
          <ToggleRow label="Require email verification" desc="New users must verify their email before using the platform" {...bool("requireEmailVerification")} />
          <Separator />
          <ToggleRow label="Auto-suspend on abuse" desc="Automatically suspend accounts that hit rate limits repeatedly" {...bool("autoSuspendAbuse")} />
          <Separator />
          <ToggleRow label="Block proxy / VPN traffic" desc="Reject requests from known proxy and VPN IP ranges" {...bool("blockProxies")} />
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} size="sm" className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Save security settings
        </Button>
      </div>
    </div>
  );
}

// ===========================================================================
// PERFORMANCE
// ===========================================================================
function PerformanceSection() {
  const qc = useQueryClient();
  const { data: settings } = useQuery<PlatformSettings>({
    queryKey: ["admin-settings"],
    queryFn: () => api<PlatformSettings>("/api/admin/settings"),
  });

  const [form, setForm] = useState<Partial<PlatformSettings>>({});
  const [saving, setSaving] = useState(false);

  const merged = { ...settings, ...form } as PlatformSettings;

  const save = async () => {
    setSaving(true);
    try {
      await api("/api/admin/settings", { method: "PATCH", body: JSON.stringify(form) });
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
      setForm({});
      toast.success("Performance settings saved");
    } finally {
      setSaving(false);
    }
  };

  const num = (key: keyof PlatformSettings) => ({
    value: merged[key] as number,
    onChange: (v: number) => setForm((s) => ({ ...s, [key]: v })),
  });
  const bool = (key: keyof PlatformSettings) => ({
    checked: merged[key] as boolean,
    onCheckedChange: (v: boolean) => setForm((s) => ({ ...s, [key]: v })),
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
        <StatCard icon={Activity} label="Cache" value={merged.cacheEnabled ? "ON" : "OFF"} color="text-emerald-500" bg="bg-emerald-500/10" />
        <StatCard icon={Clock} label="Cache TTL" value={`${merged.cacheTtlSeconds}s`} color="text-teal-500" bg="bg-teal-500/10" />
        <StatCard icon={Server} label="Max streams" value={String(merged.maxConcurrentStreams)} color="text-violet-500" bg="bg-violet-500/10" />
        <StatCard icon={Clock} label="Timeout" value={`${merged.responseTimeoutSeconds}s`} color="text-amber-500" bg="bg-amber-500/10" />
      </div>

      <Card className="p-4 sm:p-5">
        <div className="mb-1 flex items-center gap-2">
          <Gauge className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold sm:text-base">Caching & concurrency</h3>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">Tune how the platform handles AI requests and responses.</p>
        <div className="space-y-4">
          <ToggleRow label="Enable response caching" desc="Cache identical AI requests to reduce backend load and cost" {...bool("cacheEnabled")} />
          <Separator />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Cache TTL (seconds)</Label>
              <Input type="number" {...num("cacheTtlSeconds")} onChange={(e) => num("cacheTtlSeconds").onChange(Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Max concurrent streams</Label>
              <Input type="number" {...num("maxConcurrentStreams")} onChange={(e) => num("maxConcurrentStreams").onChange(Number(e.target.value))} />
            </div>
          </div>
          <Separator />
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Response timeout (seconds)</Label>
            <Input type="number" {...num("responseTimeoutSeconds")} onChange={(e) => num("responseTimeoutSeconds").onChange(Number(e.target.value))} />
            <p className="text-[11px] text-muted-foreground">Requests that exceed this timeout are cancelled and the user is notified.</p>
          </div>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} size="sm" className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Save performance settings
        </Button>
      </div>
    </div>
  );
}

// ===========================================================================
// SYSTEM
// ===========================================================================
function SystemSection() {
  const qc = useQueryClient();
  const { data: settings } = useQuery<PlatformSettings>({
    queryKey: ["admin-settings"],
    queryFn: () => api<PlatformSettings>("/api/admin/settings"),
  });

  const [form, setForm] = useState<Partial<PlatformSettings>>({});
  const [savingFlags, setSavingFlags] = useState(false);
  const [savingCosts, setSavingCosts] = useState(false);

  const merged = { ...settings, ...form } as PlatformSettings;

  const saveFlags = async () => {
    setSavingFlags(true);
    try {
      await api("/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({ allowSignups: merged.allowSignups, maintenanceMode: merged.maintenanceMode }),
      });
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
      setForm((s) => ({ ...s, allowSignups: undefined, maintenanceMode: undefined }));
      toast.success("Platform flags saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSavingFlags(false);
    }
  };

  const saveCosts = async () => {
    setSavingCosts(true);
    try {
      await api("/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({
          costPerChat: merged.costPerChat,
          costPerImage: merged.costPerImage,
          costPerDocument: merged.costPerDocument,
        }),
      });
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
      setForm((s) => ({ ...s, costPerChat: undefined, costPerImage: undefined, costPerDocument: undefined }));
      toast.success("Credit costs saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSavingCosts(false);
    }
  };

  const bool = (key: keyof PlatformSettings) => ({
    checked: merged[key] as boolean,
    onCheckedChange: (v: boolean) => setForm((s) => ({ ...s, [key]: v })),
  });
  const num = (key: keyof PlatformSettings) => ({
    value: merged[key] as number,
    onChange: (v: number) => setForm((s) => ({ ...s, [key]: v })),
  });

  return (
    <div className="space-y-4">
      <Card className="p-4 sm:p-5">
        <div className="mb-1 flex items-center gap-2">
          <SettingsIcon className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold sm:text-base">Platform flags</h3>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">Global controls that affect every user on the platform.</p>
        <div className="space-y-4">
          <ToggleRow label="Allow new signups" desc="When disabled, new users cannot create accounts" {...bool("allowSignups")} />
          <Separator />
          <ToggleRow label="Maintenance mode" desc="Show a maintenance banner and block non-admin access" {...bool("maintenanceMode")} />
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={saveFlags} disabled={savingFlags} size="sm" className="gap-2">
            {savingFlags ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Save flags
          </Button>
        </div>
      </Card>

      <Card className="p-4 sm:p-5">
        <div className="mb-1 flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-500" />
          <h3 className="text-sm font-semibold sm:text-base">Credit economy</h3>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">Configure how credits are charged across the platform.</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Cost per chat message</Label>
            <Input type="number" {...num("costPerChat")} onChange={(e) => num("costPerChat").onChange(Number(e.target.value))} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Cost per image</Label>
            <Input type="number" {...num("costPerImage")} onChange={(e) => num("costPerImage").onChange(Number(e.target.value))} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Cost per document</Label>
            <Input type="number" {...num("costPerDocument")} onChange={(e) => num("costPerDocument").onChange(Number(e.target.value))} />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={saveCosts} disabled={savingCosts} size="sm" className="gap-2">
            {savingCosts ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Save costs
          </Button>
        </div>
      </Card>

      <Card className="p-4 sm:p-5">
        <div className="mb-1 flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold sm:text-base">Audit log</h3>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">Recent admin actions across the platform.</p>
        <div className="space-y-2 text-xs">
          {[
            { action: "admin.user.update", target: "Sarah Chen", time: "2m ago", detail: "plan → pro" },
            { action: "admin.user.update", target: "Tom Wright", time: "1h ago", detail: "status → banned" },
            { action: "admin.settings.update", target: "platform", time: "3h ago", detail: "changed: enabledModels" },
            { action: "admin.users.view", target: "user list", time: "5h ago", detail: "" },
          ].map((log, i) => (
            <div key={i} className="flex items-center gap-2 rounded-md border bg-muted/20 px-3 py-2">
              <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary">{log.action}</span>
              <span className="flex-1 truncate">
                {log.target} {log.detail && <span className="text-muted-foreground">· {log.detail}</span>}
              </span>
              <span className="shrink-0 text-muted-foreground">{log.time}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ===========================================================================
// Helpers
// ===========================================================================
function StatCard({ icon: Icon, label, value, color, bg }: { icon: typeof Activity; label: string; value: string; color: string; bg: string }) {
  return (
    <Card className="p-3 sm:p-4">
      <div className={cn("mb-2 grid h-8 w-8 place-items-center rounded-lg", bg)}>
        <Icon className={cn("h-4 w-4", color)} />
      </div>
      <p className="text-base font-semibold tabular-nums sm:text-lg">{value}</p>
      <p className="text-[11px] text-muted-foreground sm:text-xs">{label}</p>
    </Card>
  );
}

function ToggleRow({
  label,
  desc,
  checked,
  onCheckedChange,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
