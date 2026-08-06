"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import {
  Shield,
  Cpu,
  Lock,
  Gauge,
  Plus,
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
  providerKey: string;
  providerKeyMasked: string;
  baseUrl: string;
  enabledModels: string[];
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
}

interface ModelInfo {
  id: string;
  name: string;
  description: string;
  badge: string;
  context: string;
  speed: string;
  enabled: boolean;
}

interface TestResult {
  id: string;
  name: string;
  available: boolean;
  latencyMs: number;
  error?: string;
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

  const statusColor: Record<string, string> = {
    active: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    suspended: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    banned: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  };

  return (
    <div className="space-y-3">
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
      </div>

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

// ===========================================================================
// AI MODELS — provider key + base URL + test connection + model dropdown
// ===========================================================================
function ModelsSection() {
  const qc = useQueryClient();
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[] | null>(null);
  const [allowedModels, setAllowedModels] = useState<string[] | null>(null);

  const { data: settings } = useQuery<PlatformSettings>({
    queryKey: ["admin-settings"],
    queryFn: () => api<PlatformSettings>("/api/admin/settings"),
  });

  const { data: modelsData } = useQuery<{ models: ModelInfo[] }>({
    queryKey: ["admin-models"],
    queryFn: () => api("/api/admin/models"),
  });

  // Sync base URL when settings load
  const effectiveBaseUrl = baseUrl || settings?.baseUrl || "";

  const saveKey = useMutation({
    mutationFn: () =>
      api("/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({ providerKey: apiKey, baseUrl: effectiveBaseUrl }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
      setApiKey("");
      toast.success("API key & base URL saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveBaseUrl = useMutation({
    mutationFn: () =>
      api("/api/admin/settings", { method: "PATCH", body: JSON.stringify({ baseUrl: effectiveBaseUrl }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
      toast.success("Base URL saved");
    },
  });

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
      }>("/api/admin/models/test", {
        method: "POST",
        body: JSON.stringify({
          apiKey: apiKey || undefined,
          baseUrl: effectiveBaseUrl || undefined,
        }),
      });
      setTestResults(res.results);
      setAllowedModels(res.allowed);
      // Auto-enable all available models
      await api("/api/admin/settings", { method: "PATCH", body: JSON.stringify({ enabledModels: res.allowed }) });
      qc.invalidateQueries({ queryKey: ["admin-models"] });
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
      toast.success(`Connection OK — ${res.availableCount} of ${res.total} models available`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Connection failed");
    } finally {
      setTesting(false);
    }
  };

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

  return (
    <div className="space-y-4">
      {/* Provider key + base URL */}
      <Card className="p-4 sm:p-5">
        <div className="mb-1 flex items-center gap-2">
          <Key className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold sm:text-base">AI Provider Configuration</h3>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">
          Configure the API key and base URL used by the platform. Test the connection to pull the real list of allowed models.
        </p>

        {/* Base URL */}
        <div className="mb-3 space-y-1.5">
          <Label className="text-xs text-muted-foreground">Base URL</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Link2 className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={effectiveBaseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://api.z.ai/api/paas/v4"
                className="pl-8 font-mono text-xs"
              />
            </div>
            <Button
              onClick={() => saveBaseUrl.mutate()}
              disabled={!baseUrl || saveBaseUrl.isPending}
              variant="outline"
              size="sm"
              className="shrink-0"
            >
              Save URL
            </Button>
          </div>
        </div>

        {/* API key */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">API Key</Label>
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
                placeholder="Paste your API key…"
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
              className="gap-2 shrink-0"
              size="sm"
            >
              {saveKey.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Save key
            </Button>
          </div>
        </div>
      </Card>

      {/* Test connection + pull models */}
      <Card className="p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold sm:text-base">Test connection & pull models</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Probes the backend with a tiny request per model. Available models appear in the dropdown below and are auto-enabled.
            </p>
          </div>
          <Button onClick={testConnection} disabled={testing} className="gap-2 shrink-0" size="sm">
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {testing ? "Testing…" : "Test & pull"}
          </Button>
        </div>

        {/* Allowed models dropdown — appears after a successful test */}
        {allowedModels && (
          <div className="mt-4 space-y-2">
            <Label className="text-xs text-muted-foreground">Allowed models for this API key</Label>
            <Select defaultValue="">
              <SelectTrigger className="w-full">
                <SelectValue placeholder={`${allowedModels.length} models available`} />
              </SelectTrigger>
              <SelectContent>
                {allowedModels.map((id) => {
                  const m = (modelsData?.models ?? []).find((x) => x.id === id);
                  return (
                    <SelectItem key={id} value={id}>
                      {m?.name ?? id} {id === "auto" ? "· router" : `· ${m?.context ?? ""}`}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        )}

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
                  {r.available ? (
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <X className="h-3.5 w-3.5 text-rose-500" />
                  )}
                  <span className="flex-1 truncate font-medium">{r.name}</span>
                  {r.available ? (
                    <span className="text-muted-foreground">{r.latencyMs}ms</span>
                  ) : (
                    <span className="truncate text-rose-400" title={r.error}>{r.error?.slice(0, 30)}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Model catalog */}
      <Card className="p-4 sm:p-5">
        <div className="mb-1 flex items-center gap-2">
          <Cpu className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold sm:text-base">Model catalog</h3>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">
          Enable or disable models available to users across chat, documents and agents.
        </p>

        <div className="space-y-2">
          {(modelsData?.models ?? []).map((m) => (
            <div
              key={m.id}
              className={cn(
                "flex items-center gap-3 rounded-lg border p-3 transition-colors",
                m.enabled ? "bg-card" : "bg-muted/20 opacity-70"
              )}
            >
              <div className={cn(
                "grid h-9 w-9 shrink-0 place-items-center rounded-lg",
                m.enabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
              )}>
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium">{m.name}</p>
                  <Badge variant="outline" className="text-[10px]">{m.badge}</Badge>
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {m.description} · {m.context} context · {m.speed}
                </p>
              </div>
              <Switch
                checked={m.enabled}
                onCheckedChange={(v) => toggleModel.mutate({ id: m.id, enabled: v })}
                aria-label={`Toggle ${m.name}`}
              />
            </div>
          ))}
        </div>
      </Card>
    </div>
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
  return (
    <div className="space-y-4">
      <Card className="p-4 sm:p-5">
        <div className="mb-1 flex items-center gap-2">
          <SettingsIcon className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold sm:text-base">Platform flags</h3>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">Global controls that affect every user on the platform.</p>
        <div className="space-y-4">
          <ToggleRow label="Allow new signups" desc="When disabled, new users cannot create accounts" checked={true} onCheckedChange={() => toast.info("Flag updated (demo)")} />
          <Separator />
          <ToggleRow label="Maintenance mode" desc="Show a maintenance banner and block non-admin access" checked={false} onCheckedChange={() => toast.info("Flag updated (demo)")} />
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
            <Input type="number" defaultValue={1} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Cost per image</Label>
            <Input type="number" defaultValue={8} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Cost per document</Label>
            <Input type="number" defaultValue={5} />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button size="sm" onClick={() => toast.success("Credit costs updated (demo)")}>Save costs</Button>
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
