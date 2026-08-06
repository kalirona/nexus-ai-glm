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
  AlertTriangle,
  Activity,
  Server,
  Clock,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

type Section = "models" | "security" | "performance";

const SECTIONS: { id: Section; label: string; icon: typeof Cpu; desc: string }[] = [
  { id: "models", label: "AI Models", icon: Cpu, desc: "Provider keys, model availability & routing" },
  { id: "security", label: "Security", icon: Lock, desc: "Rate limits, access control & abuse protection" },
  { id: "performance", label: "Performance", icon: Gauge, desc: "Caching, concurrency & timeouts" },
];

interface PlatformSettings {
  providerKey: string;
  providerKeyMasked: string;
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

export function AdminView() {
  const [section, setSection] = useState<Section>("models");

  const active = SECTIONS.find((s) => s.id === section)!;

  return (
    <div className="mx-auto w-full max-w-5xl px-3 py-4 sm:px-4 sm:py-6 md:px-6 md:py-8">
      {/* Header */}
      <div className="mb-6 flex items-center gap-2">
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
      <div className="mb-5 grid grid-cols-3 gap-2 sm:flex sm:gap-2">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          const isActive = section === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className={cn(
                "flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all sm:flex-1 sm:justify-start",
                isActive
                  ? "border-primary bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">{s.label}</span>
              <span className="sm:hidden text-xs">{s.label}</span>
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
          {section === "models" && <ModelsSection />}
          {section === "security" && <SecuritySection />}
          {section === "performance" && <PerformanceSection />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ===========================================================================
// AI MODELS SECTION
// ===========================================================================
function ModelsSection() {
  const qc = useQueryClient();
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[] | null>(null);

  const { data: settings } = useQuery<PlatformSettings>({
    queryKey: ["admin-settings"],
    queryFn: () => api<PlatformSettings>("/api/admin/settings"),
  });

  const { data: modelsData } = useQuery<{ models: ModelInfo[] }>({
    queryKey: ["admin-models"],
    queryFn: () => api("/api/admin/models"),
  });

  const saveKey = useMutation({
    mutationFn: () =>
      api("/api/admin/settings", { method: "PATCH", body: JSON.stringify({ providerKey: apiKey }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
      setApiKey("");
      toast.success("API key saved & encrypted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const pullModels = async () => {
    setTesting(true);
    setTestResults(null);
    try {
      const res = await api<{ results: TestResult[]; allowed: string[]; availableCount: number; total: number }>(
        "/api/admin/models/test",
        { method: "POST", body: JSON.stringify(apiKey ? { apiKey } : {}) }
      );
      setTestResults(res.results);
      // Auto-enable all available models
      await api("/api/admin/settings", { method: "PATCH", body: JSON.stringify({ enabledModels: res.allowed }) });
      qc.invalidateQueries({ queryKey: ["admin-models"] });
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
      toast.success(`Pulled ${res.availableCount} of ${res.total} models from backend`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to pull models");
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
      {/* Provider key */}
      <Card className="p-4 sm:p-5">
        <div className="mb-1 flex items-center gap-2">
          <Key className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold sm:text-base">AI Provider Key</h3>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">
          Add or rotate the API key used by the platform to call the AI backend. The key is stored encrypted and never returned in full.
        </p>

        {settings?.providerKeyMasked && (
          <div className="mb-3 flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2">
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
          >
            {saveKey.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Save key
          </Button>
        </div>
      </Card>

      {/* Pull models */}
      <Card className="p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold sm:text-base">Pull backend models</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Probes each model in the catalog with a tiny request to check which are actually available on the backend. Available models are auto-enabled.
            </p>
          </div>
          <Button onClick={pullModels} disabled={testing} className="gap-2 shrink-0" size="sm">
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {testing ? "Probing…" : "Pull models"}
          </Button>
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
// SECURITY SECTION
// ===========================================================================
function SecuritySection() {
  const qc = useQueryClient();
  const { data: settings } = useQuery<PlatformSettings>({
    queryKey: ["admin-settings"],
    queryFn: () => api<PlatformSettings>("/api/admin/settings"),
  });

  const [form, setForm] = useState<Partial<PlatformSettings>>({});
  const [saving, setSaving] = useState(false);

  // Sync form when settings load
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
          <ToggleRow
            label="Require email verification"
            desc="New users must verify their email before using the platform"
            {...bool("requireEmailVerification")}
          />
          <Separator />
          <ToggleRow
            label="Auto-suspend on abuse"
            desc="Automatically suspend accounts that hit rate limits repeatedly"
            {...bool("autoSuspendAbuse")}
          />
          <Separator />
          <ToggleRow
            label="Block proxy / VPN traffic"
            desc="Reject requests from known proxy and VPN IP ranges"
            {...bool("blockProxies")}
          />
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
// PERFORMANCE SECTION
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
      {/* Live stats */}
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
          <ToggleRow
            label="Enable response caching"
            desc="Cache identical AI requests to reduce backend load and cost"
            {...bool("cacheEnabled")}
          />
          <Separator />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Cache TTL (seconds)</Label>
              <Input
                type="number"
                {...num("cacheTtlSeconds")}
                onChange={(e) => num("cacheTtlSeconds").onChange(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Max concurrent streams</Label>
              <Input
                type="number"
                {...num("maxConcurrentStreams")}
                onChange={(e) => num("maxConcurrentStreams").onChange(Number(e.target.value))}
              />
            </div>
          </div>
          <Separator />
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Response timeout (seconds)</Label>
            <Input
              type="number"
              {...num("responseTimeoutSeconds")}
              onChange={(e) => num("responseTimeoutSeconds").onChange(Number(e.target.value))}
            />
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
