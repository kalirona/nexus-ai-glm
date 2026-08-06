"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { AI_PROVIDERS, AI_MODELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Server,
  Cpu,
  Star,
  BarChart3,
  Route,
  KeyRound,
  Gauge,
  ScrollText,
  Activity,
  Shield,
  ShieldAlert,
  Plus,
  Trash2,
  Check,
  X,
  Loader2,
  RefreshCw,
  Eye,
  EyeOff,
  Search,
  Link2,
  Download,
  Zap,
  ImageIcon,
  Video,
  AudioLines,
  Brain,
  Boxes,
  Wrench,
  MessageSquare,
  PenLine,
  Microscope,
  Bot,
  Workflow,
  ShieldCheck,
  Crown,
  Clock,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ChevronRight,
  Lock,
  ExternalLink,
  CircleDot,
  ArrowRight,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

// ===========================================================================
// Types
// ===========================================================================

interface ProviderCapabilities {
  streaming: boolean;
  vision: boolean;
  embedding: boolean;
  audio: boolean;
  image: boolean;
  video: boolean;
  reasoning: boolean;
  functionCalling: boolean;
}

interface ConfiguredProvider {
  id: string;
  name: string;
  providerType: string;
  description: string;
  baseUrl: string;
  docsUrl: string;
  status: "active" | "inactive" | "unconfigured";
  apiKeyMasked: string;
  hasKey: boolean;
  capabilities: ProviderCapabilities;
  authScheme: string;
  modelsEndpoint: string;
  lastTestedAt?: string;
  lastTestSuccess?: boolean;
  lastTestLatencyMs?: number;
  lastTestError?: string;
  orgId?: string;
  projectId?: string;
  region?: string;
  timeout?: number;
  retryCount?: number;
}

interface LiveModelCapabilities {
  vision?: boolean;
  functionCalling?: boolean;
  reasoning?: boolean;
  streaming?: boolean;
}

interface LiveModel {
  id: string;
  name: string;
  provider: string;
  contextWindow?: number;
  inputCost?: number;
  outputCost?: number;
  capabilities?: LiveModelCapabilities;
}

interface AiUsageLog {
  id: string;
  provider: string;
  model: string;
  requestType: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number;
  durationMs: number;
  success: boolean;
  errorMessage: string | null;
  streaming: boolean;
  createdAt: string;
}

interface UsageTotals {
  totalRequests: number;
  requestsToday: number;
  requestsThisMonth: number;
  totalTokens: number;
  totalCost: number;
  errorRate: number;
  avgLatency: number;
  streamingRequests: number;
  imageRequests: number;
  errorCount: number;
}

interface UsageSeriesPoint {
  label: string;
  requests: number;
  tokens: number;
  cost: number;
  errors: number;
}

interface UsageByProvider {
  provider: string;
  requests: number;
  tokens: number;
  cost: number;
}

interface UsageByModel {
  model: string;
  requests: number;
  tokens: number;
  cost: number;
}

interface UsageResponse {
  totals: UsageTotals;
  series: UsageSeriesPoint[];
  byProvider: UsageByProvider[];
  byModel: UsageByModel[];
  recent: AiUsageLog[];
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
  lastUsedAt?: string;
  expiresAt?: string;
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

interface AiLimits {
  monthlyBudget: number;
  dailyBudget: number;
  maxTokensPerRequest: number;
  maxRequestsPerDay: number;
  maxConcurrentRequests: number;
  perUserDailyLimit: number;
  perProjectDailyLimit: number;
  perAgentDailyLimit: number;
}

interface PlatformSettings {
  providerId: string;
  baseUrl: string;
  enabledModels: string[];
  customModels: CustomModel[];
  apiKeys: ApiKeyConfig[];
  defaultModels: Record<string, string>;
  routingRules: Record<string, { primary: string; fallback: string }>;
  aiLimits: AiLimits;
  defaultModel: string;
  [key: string]: unknown;
}

interface TestResult {
  success: boolean;
  latencyMs: number;
  modelCount: number;
  error?: string;
}

// ===========================================================================
// Constants
// ===========================================================================

type TabId =
  | "providers"
  | "models"
  | "defaults"
  | "usage"
  | "routing"
  | "credentials"
  | "limits"
  | "logs"
  | "health";

const TABS: { id: TabId; label: string; icon: typeof Server }[] = [
  { id: "providers", label: "Providers", icon: Server },
  { id: "models", label: "Models", icon: Cpu },
  { id: "defaults", label: "Defaults", icon: Star },
  { id: "usage", label: "Usage", icon: BarChart3 },
  { id: "routing", label: "Routing", icon: Route },
  { id: "credentials", label: "Credentials", icon: KeyRound },
  { id: "limits", label: "Limits", icon: Gauge },
  { id: "logs", label: "Logs", icon: ScrollText },
  { id: "health", label: "Health", icon: Activity },
];

const USE_CASES: {
  id: string;
  label: string;
  icon: typeof MessageSquare;
  desc: string;
}[] = [
  { id: "chat", label: "Chat", icon: MessageSquare, desc: "Conversational assistant" },
  { id: "reasoning", label: "Reasoning", icon: Brain, desc: "Deep multi-step thinking" },
  { id: "coding", label: "Coding", icon: Wrench, desc: "Code generation & review" },
  { id: "writing", label: "Writing", icon: PenLine, desc: "Long-form content" },
  { id: "research", label: "Research", icon: Microscope, desc: "Research & analysis" },
  { id: "vision", label: "Vision", icon: Eye, desc: "Image understanding" },
  { id: "image", label: "Image Gen", icon: ImageIcon, desc: "Image creation" },
  { id: "video", label: "Video Gen", icon: Video, desc: "Video creation" },
  { id: "audio", label: "Audio", icon: AudioLines, desc: "Speech & audio" },
  { id: "embedding", label: "Embeddings", icon: Boxes, desc: "Vector embeddings" },
  { id: "moderation", label: "Moderation", icon: ShieldCheck, desc: "Content safety" },
  { id: "agents", label: "AI Employees", icon: Bot, desc: "Autonomous agents" },
  { id: "workflows", label: "Workflows", icon: Workflow, desc: "Multi-step flows" },
];

const ROUTING_USE_CASES: { id: string; label: string }[] = [
  { id: "chat", label: "Chat" },
  { id: "research", label: "Research" },
  { id: "coding", label: "Coding" },
  { id: "reasoning", label: "Reasoning" },
  { id: "images", label: "Images" },
  { id: "video", label: "Video" },
];

const CAPABILITY_ICONS: { key: keyof ProviderCapabilities; icon: typeof Zap; label: string }[] = [
  { key: "streaming", icon: Zap, label: "Streaming" },
  { key: "vision", icon: Eye, label: "Vision" },
  { key: "embedding", icon: Boxes, label: "Embeddings" },
  { key: "audio", icon: AudioLines, label: "Audio" },
  { key: "image", icon: ImageIcon, label: "Image" },
  { key: "video", icon: Video, label: "Video" },
  { key: "reasoning", icon: Brain, label: "Reasoning" },
  { key: "functionCalling", icon: Wrench, label: "Function calling" },
];

const DEFAULT_LIMITS: AiLimits = {
  monthlyBudget: 500,
  dailyBudget: 25,
  maxTokensPerRequest: 128000,
  maxRequestsPerDay: 10000,
  maxConcurrentRequests: 50,
  perUserDailyLimit: 500,
  perProjectDailyLimit: 2000,
  perAgentDailyLimit: 1000,
};

// ===========================================================================
// Helpers
// ===========================================================================

function timeAgo(iso?: string): string {
  if (!iso) return "never";
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

function fmtNum(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function fmtCost(n: number): string {
  if (n >= 1) return `$${n.toFixed(2)}`;
  if (n >= 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(6)}`;
}

function fmtMs(n: number): string {
  if (n < 1000) return `${n}ms`;
  return `${(n / 1000).toFixed(2)}s`;
}

function buildModelOptions(settings?: PlatformSettings): { id: string; label: string }[] {
  const opts: { id: string; label: string }[] = [];
  // Built-in enabled models
  for (const m of AI_MODELS) {
    if (settings?.enabledModels?.includes(m.id)) {
      opts.push({ id: m.id, label: m.name });
    }
  }
  // Custom enabled models
  for (const m of settings?.customModels ?? []) {
    if (m.enabled) opts.push({ id: m.modelId, label: m.name });
  }
  // If nothing enabled, fall back to all built-ins so the dropdown isn't empty
  if (opts.length === 0) {
    for (const m of AI_MODELS) opts.push({ id: m.id, label: m.name });
  }
  return opts;
}

// ===========================================================================
// Main component
// ===========================================================================

export function AIInfraView() {
  const [activeTab, setActiveTab] = useState<TabId>("providers");
  const [modelsProviderId, setModelsProviderId] = useState<string>("");

  const openModelsFor = (providerId: string) => {
    setModelsProviderId(providerId);
    setActiveTab("models");
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-4 sm:py-6 md:px-6 md:py-8">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h2 className="text-xl font-semibold tracking-tight md:text-2xl">AI Infrastructure</h2>
        <Badge className="gap-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white">
          <Crown className="h-3 w-3" /> Super Admin
        </Badge>
      </div>

      {/* Warning banner */}
      <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3.5 py-2.5">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
        <p className="text-xs text-amber-700 dark:text-amber-400">
          <span className="font-medium">Super Admin mode.</span> Changes here affect AI providers, models, and routing for the entire platform.
        </p>
      </div>

      {/* Tab bar */}
      <div className="mb-5 grid grid-cols-3 gap-1.5 sm:grid-cols-5 lg:grid-cols-9">
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-lg border px-2 py-2.5 text-xs font-medium transition-all sm:flex-row sm:justify-center sm:gap-2 lg:flex-col lg:px-1",
                isActive
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18 }}
        >
          {activeTab === "providers" && <ProvidersSection onOpenModels={openModelsFor} />}
          {activeTab === "models" && (
            <ModelsSection providerId={modelsProviderId} onProviderChange={setModelsProviderId} />
          )}
          {activeTab === "defaults" && <DefaultsSection />}
          {activeTab === "usage" && <UsageSection />}
          {activeTab === "routing" && <RoutingSection />}
          {activeTab === "credentials" && <CredentialsSection />}
          {activeTab === "limits" && <LimitsSection />}
          {activeTab === "logs" && <LogsSection />}
          {activeTab === "health" && <HealthSection onOpenModels={openModelsFor} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ===========================================================================
// 1. PROVIDERS
// ===========================================================================

function ProvidersSection({ onOpenModels }: { onOpenModels: (id: string) => void }) {
  const qc = useQueryClient();
  const [testingId, setTestingId] = useState<string | null>(null);
  const [configProvider, setConfigProvider] = useState<ConfiguredProvider | null>(null);

  const { data: providers = [], isLoading } = useQuery<ConfiguredProvider[]>({
    queryKey: ["ai-providers"],
    queryFn: () => api<{ providers: ConfiguredProvider[] }>("/api/admin/providers").then((r) => r.providers),
  });

  const patchProvider = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api("/api/admin/providers", { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-providers"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const testProvider = async (id: string) => {
    setTestingId(id);
    try {
      const res = await api<TestResult>(`/api/admin/providers/${id}/test`, { method: "POST" });
      if (res.success) {
        toast.success(`Connection OK · ${res.modelCount} models · ${fmtMs(res.latencyMs)}`);
      } else {
        toast.error(res.error || "Connection failed");
      }
      qc.invalidateQueries({ queryKey: ["ai-providers"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Test failed");
    } finally {
      setTestingId(null);
    }
  };

  const statusBadge = (status: ConfiguredProvider["status"]) => {
    if (status === "active")
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
          <CircleDot className="h-2.5 w-2.5" /> Active
        </span>
      );
    if (status === "inactive")
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
          <CircleDot className="h-2.5 w-2.5" /> Inactive
        </span>
      );
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
        <CircleDot className="h-2.5 w-2.5" /> Unconfigured
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <Card key={i} className="h-44 animate-pulse bg-muted/40" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {providers.length} providers · {providers.filter((p) => p.status === "active").length} active ·{" "}
          {providers.filter((p) => p.hasKey).length} with keys
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {providers.map((p) => (
          <Card key={p.id} className="flex flex-col p-4">
            <div className="mb-2 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <button
                  onClick={() => setConfigProvider(p)}
                  className="flex items-center gap-1.5 text-left hover:underline"
                >
                  <h3 className="truncate text-sm font-semibold">{p.name}</h3>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                </button>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{p.description}</p>
              </div>
              {statusBadge(p.status)}
            </div>

            {p.baseUrl ? (
              <div className="mb-2 flex items-center gap-1.5 truncate rounded-md bg-muted/50 px-2 py-1 text-[10px] font-mono text-muted-foreground">
                <Link2 className="h-3 w-3 shrink-0" />
                <span className="truncate">{p.baseUrl}</span>
              </div>
            ) : (
              <div className="mb-2 rounded-md bg-muted/50 px-2 py-1 text-[10px] text-muted-foreground">
                Custom endpoint required
              </div>
            )}

            {/* Capabilities */}
            <div className="mb-3 flex flex-wrap gap-1">
              {CAPABILITY_ICONS.filter((c) => p.capabilities[c.key]).map((c) => {
                const Icon = c.icon;
                return (
                  <span
                    key={c.key}
                    title={c.label}
                    className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary"
                  >
                    <Icon className="h-3 w-3" />
                  </span>
                );
              })}
            </div>

            {/* Last test */}
            <div className="mb-3 flex items-center gap-2 text-[11px]">
              {p.lastTestedAt ? (
                <>
                  {p.lastTestSuccess ? (
                    <Badge variant="outline" className="gap-1 border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                      <Check className="h-2.5 w-2.5" /> {p.lastTestLatencyMs ? fmtMs(p.lastTestLatencyMs) : "OK"}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1 border-rose-500/30 text-rose-600 dark:text-rose-400">
                      <X className="h-2.5 w-2.5" /> Failed
                    </Badge>
                  )}
                  <span className="text-muted-foreground">{timeAgo(p.lastTestedAt)}</span>
                </>
              ) : (
                <span className="text-muted-foreground">Not tested yet</span>
              )}
            </div>

            {/* Actions */}
            <div className="mt-auto flex items-center gap-1.5">
              <Button
                size="sm"
                variant="outline"
                className="h-7 flex-1 gap-1 text-[11px]"
                onClick={() => testProvider(p.id)}
                disabled={testingId === p.id || !p.hasKey}
                title={!p.hasKey ? "No API key configured" : "Test connection"}
              >
                {testingId === p.id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Zap className="h-3 w-3" />
                )}
                Test
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 flex-1 gap-1 text-[11px]"
                onClick={() => onOpenModels(p.id)}
                disabled={!p.modelsEndpoint}
                title={!p.modelsEndpoint ? "Live model listing not supported" : "Browse models"}
              >
                <Cpu className="h-3 w-3" />
                Models
              </Button>
              <Switch
                checked={p.status !== "inactive"}
                onCheckedChange={(v) =>
                  patchProvider.mutate({ providerId: p.id, active: v })
                }
                title={p.status === "unconfigured" ? "Add a key first" : "Toggle active"}
                disabled={p.status === "unconfigured"}
              />
            </div>
          </Card>
        ))}
      </div>

      {/* Config dialog */}
      <ProviderConfigDialog
        provider={configProvider}
        onClose={() => setConfigProvider(null)}
      />
    </div>
  );
}

function ProviderConfigDialog({
  provider,
  onClose,
}: {
  provider: ConfiguredProvider | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!provider} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        {provider && (
          <ProviderConfigForm key={provider.id} provider={provider} onClose={onClose} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ProviderConfigForm({
  provider,
  onClose,
}: {
  provider: ConfiguredProvider;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const def = AI_PROVIDERS.find((p) => p.id === provider.id);
  // Lazy initializer reads from the provider prop once on mount. The dialog
  // keys this component by provider.id, so opening a different provider
  // remounts it and re-initialises the form — no syncing effect needed.
  const [form, setForm] = useState({
    orgId: provider.orgId ?? "",
    projectId: provider.projectId ?? "",
    region: provider.region ?? "",
    timeout: provider.timeout ?? 30,
    retryCount: provider.retryCount ?? 2,
  });

  const save = useMutation({
    mutationFn: () =>
      api("/api/admin/providers", {
        method: "PATCH",
        body: JSON.stringify({
          providerId: provider.id,
          orgId: form.orgId,
          projectId: form.projectId,
          region: form.region,
          timeout: Number(form.timeout),
          retryCount: Number(form.retryCount),
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-providers"] });
      toast.success("Provider config saved");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const supportsOrg = def?.supportsOrgId;
  const supportsProject = def?.supportsProjectId;
  const supportsRegion = def?.supportsRegion;

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Server className="h-4 w-4 text-primary" />
          {provider.name} configuration
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-3 py-1">
        <div className="rounded-md bg-muted/50 p-2.5 text-xs text-muted-foreground">
          {provider.description}
        </div>
        {provider.apiKeyMasked && (
          <div className="flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs">
            <Lock className="h-3 w-3 text-emerald-500" />
            <span className="text-muted-foreground">Key:</span>
            <span className="font-mono">{provider.apiKeyMasked}</span>
          </div>
        )}
        <Separator />
        {supportsOrg && (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Organization ID</Label>
            <Input
              value={form.orgId}
              onChange={(e) => setForm((s) => ({ ...s, orgId: e.target.value }))}
              placeholder="org-xxxx"
            />
          </div>
        )}
        {supportsProject && (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Project ID</Label>
            <Input
              value={form.projectId}
              onChange={(e) => setForm((s) => ({ ...s, projectId: e.target.value }))}
              placeholder="proj-xxxx"
            />
          </div>
        )}
        {supportsRegion && (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Region</Label>
            <Input
              value={form.region}
              onChange={(e) => setForm((s) => ({ ...s, region: e.target.value }))}
              placeholder="us-east-1"
            />
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Timeout (s)</Label>
            <Input
              type="number"
              value={form.timeout}
              onChange={(e) => setForm((s) => ({ ...s, timeout: Number(e.target.value) }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Retry count</Label>
            <Input
              type="number"
              value={form.retryCount}
              onChange={(e) => setForm((s) => ({ ...s, retryCount: Number(e.target.value) }))}
            />
          </div>
        </div>
        {!supportsOrg && !supportsProject && !supportsRegion && (
          <p className="text-xs text-muted-foreground">
            This provider uses only timeout and retry tuning. Add an API key in the Credentials tab.
          </p>
        )}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending} className="gap-2">
          {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Save config
        </Button>
      </DialogFooter>
    </>
  );
}

// ===========================================================================
// 2. MODELS
// ===========================================================================

function ModelsSection({
  providerId,
  onProviderChange,
}: {
  providerId: string;
  onProviderChange: (id: string) => void;
}) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterCap, setFilterCap] = useState<string>("all");
  const [fetchTrigger, setFetchTrigger] = useState(0);

  const { data: providers = [] } = useQuery<ConfiguredProvider[]>({
    queryKey: ["ai-providers"],
    queryFn: () => api<{ providers: ConfiguredProvider[] }>("/api/admin/providers").then((r) => r.providers),
  });

  const { data: settings } = useQuery<PlatformSettings>({
    queryKey: ["ai-settings"],
    queryFn: () => api<PlatformSettings>("/api/admin/settings"),
  });

  // Auto-pick the first provider with a key if none selected (computed locally —
  // no effect needed; the Select reads this value and writes back on explicit change).
  const effectiveProvider = providerId || providers.find((p) => p.hasKey)?.id || providers[0]?.id || "";

  const isFetching = fetchTrigger > 0 && !!effectiveProvider;
  const { data: modelsRes, isLoading: modelsLoading } = useQuery<{ models: LiveModel[]; count?: number; error?: string }>({
    queryKey: ["ai-provider-models", effectiveProvider, fetchTrigger],
    queryFn: () => api(`/api/admin/providers/${effectiveProvider}/models`),
    enabled: isFetching,
  });

  const models = modelsRes?.models ?? [];
  const fetchError = modelsRes?.error;

  const filtered = useMemo(() => {
    let list = models;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (m) => m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q)
      );
    }
    if (filterCap !== "all") {
      list = list.filter((m) => m.capabilities?.[filterCap as keyof LiveModelCapabilities]);
    }
    return list;
  }, [models, search, filterCap]);

  const enabledModels = settings?.enabledModels ?? [];
  const defaultModel = settings?.defaultModel ?? "";

  const toggleEnabled = useMutation({
    mutationFn: (modelId: string) => {
      const next = enabledModels.includes(modelId)
        ? enabledModels.filter((m) => m !== modelId)
        : [...enabledModels, modelId];
      return api("/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({ enabledModels: next }),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setDefault = useMutation({
    mutationFn: (modelId: string) =>
      api("/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({ defaultModel: defaultModel === modelId ? "" : modelId }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-settings"] });
      toast.success("Default model updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const selectedProvider = providers.find((p) => p.id === effectiveProvider);

  return (
    <div className="space-y-3">
      {/* Top bar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Select value={effectiveProvider} onValueChange={onProviderChange}>
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue placeholder="Select provider" />
          </SelectTrigger>
          <SelectContent>
            {providers.map((p) => (
              <SelectItem key={p.id} value={p.id} disabled={!p.hasKey && p.authScheme !== "none"}>
                <span className="flex items-center gap-2">
                  <CircleDot
                    className={cn(
                      "h-2.5 w-2.5",
                      p.status === "active"
                        ? "text-emerald-500"
                        : p.status === "inactive"
                        ? "text-amber-500"
                        : "text-muted-foreground"
                    )}
                  />
                  {p.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          size="sm"
          className="gap-2"
          onClick={() => setFetchTrigger((n) => n + 1)}
          disabled={!effectiveProvider || !selectedProvider?.modelsEndpoint}
          title={!selectedProvider?.modelsEndpoint ? "Provider does not support model listing" : "Fetch models"}
        >
          <RefreshCw className="h-4 w-4" />
          Fetch models
        </Button>

        {selectedProvider?.docsUrl && (
          <a
            href={selectedProvider.docsUrl}
            target="_blank"
            rel="noreferrer"
            className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            Docs <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>

      {!selectedProvider?.modelsEndpoint && (
        <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3.5 py-2.5 text-xs text-amber-700 dark:text-amber-400">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          This provider does not support live model listing. Add models manually in the Credentials tab as custom models.
        </div>
      )}

      {/* Search + filter */}
      {(models.length > 0 || fetchError) && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search models…"
              className="pl-8"
            />
          </div>
          <Select value={filterCap} onValueChange={setFilterCap}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All capabilities</SelectItem>
              <SelectItem value="vision">Vision</SelectItem>
              <SelectItem value="functionCalling">Function calling</SelectItem>
              <SelectItem value="reasoning">Reasoning</SelectItem>
              <SelectItem value="streaming">Streaming</SelectItem>
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            onClick={() => setFetchTrigger((n) => n + 1)}
            disabled={!effectiveProvider}
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>
      )}

      {/* Loading skeleton */}
      {modelsLoading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-md bg-muted/40" />
          ))}
        </div>
      )}

      {/* Error */}
      {fetchError && !modelsLoading && (
        <div className="flex items-start gap-2.5 rounded-lg border border-rose-500/30 bg-rose-500/5 px-3.5 py-2.5 text-xs text-rose-600 dark:text-rose-400">
          <X className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <div>
            <p className="font-medium">Failed to fetch models</p>
            <p className="mt-0.5 opacity-90">{fetchError}</p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!modelsLoading && !fetchError && models.length === 0 && (
        <Card className="flex flex-col items-center justify-center gap-2 py-12 text-center">
          <Cpu className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm font-medium">No models loaded</p>
          <p className="text-xs text-muted-foreground">
            Select a provider and click “Fetch models” to pull the live model list.
          </p>
        </Card>
      )}

      {/* Models table */}
      {models.length > 0 && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Model</th>
                  <th className="hidden px-3 py-2 font-medium sm:table-cell">Context</th>
                  <th className="hidden px-3 py-2 font-medium md:table-cell">Input $/M</th>
                  <th className="hidden px-3 py-2 font-medium md:table-cell">Output $/M</th>
                  <th className="px-3 py-2 font-medium">Caps</th>
                  <th className="px-3 py-2 text-right font-medium">Enabled</th>
                  <th className="px-3 py-2 text-center font-medium">Default</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((m) => {
                  const enabled = enabledModels.includes(m.id);
                  const isDefault = defaultModel === m.id;
                  return (
                    <tr key={m.id} className="hover:bg-muted/30">
                      <td className="px-3 py-2">
                        <div className="font-medium">{m.name}</div>
                        <div className="text-[10px] font-mono text-muted-foreground">{m.id}</div>
                      </td>
                      <td className="hidden px-3 py-2 tabular-nums text-xs text-muted-foreground sm:table-cell">
                        {m.contextWindow ? m.contextWindow.toLocaleString() : "—"}
                      </td>
                      <td className="hidden px-3 py-2 tabular-nums text-xs text-muted-foreground md:table-cell">
                        {m.inputCost != null ? fmtCost(m.inputCost) : "—"}
                      </td>
                      <td className="hidden px-3 py-2 tabular-nums text-xs text-muted-foreground md:table-cell">
                        {m.outputCost != null ? fmtCost(m.outputCost) : "—"}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          {m.capabilities?.vision && (
                            <span title="Vision" className="inline-flex h-5 w-5 items-center justify-center rounded bg-primary/10 text-primary">
                              <Eye className="h-2.5 w-2.5" />
                            </span>
                          )}
                          {m.capabilities?.functionCalling && (
                            <span title="Function calling" className="inline-flex h-5 w-5 items-center justify-center rounded bg-primary/10 text-primary">
                              <Wrench className="h-2.5 w-2.5" />
                            </span>
                          )}
                          {m.capabilities?.reasoning && (
                            <span title="Reasoning" className="inline-flex h-5 w-5 items-center justify-center rounded bg-primary/10 text-primary">
                              <Brain className="h-2.5 w-2.5" />
                            </span>
                          )}
                          {m.capabilities?.streaming && (
                            <span title="Streaming" className="inline-flex h-5 w-5 items-center justify-center rounded bg-primary/10 text-primary">
                              <Zap className="h-2.5 w-2.5" />
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Switch
                          checked={enabled}
                          onCheckedChange={() => toggleEnabled.mutate(m.id)}
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() => setDefault.mutate(m.id)}
                          className="inline-flex h-6 w-6 items-center justify-center rounded hover:bg-muted"
                          title={isDefault ? "Remove default" : "Set as default"}
                        >
                          <Star
                            className={cn(
                              "h-4 w-4",
                              isDefault ? "fill-amber-500 text-amber-500" : "text-muted-foreground"
                            )}
                          />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="border-t px-3 py-2 text-[11px] text-muted-foreground">
            Showing {filtered.length} of {models.length} models · {enabledModels.length} enabled platform-wide
          </div>
        </Card>
      )}
    </div>
  );
}

// ===========================================================================
// 3. DEFAULTS
// ===========================================================================

function DefaultsSection() {
  const qc = useQueryClient();
  const { data: settings, isLoading } = useQuery<PlatformSettings>({
    queryKey: ["ai-settings"],
    queryFn: () => api<PlatformSettings>("/api/admin/settings"),
  });

  // Local "edits" overlay on top of the persisted defaultModels.
  // Avoids syncing effects — the effective value reads from settings, then edits.
  const [edits, setEdits] = useState<Record<string, string>>({});

  const save = useMutation({
    mutationFn: () => {
      const merged = { ...(settings?.defaultModels ?? {}), ...edits };
      return api("/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({ defaultModels: merged }),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-settings"] });
      setEdits({});
      toast.success("Default models saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const modelOptions = buildModelOptions(settings);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="h-32 animate-pulse bg-muted/40" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Pick the default model for each use case. Only enabled models appear in the dropdowns.
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {USE_CASES.map((uc) => {
          const Icon = uc.icon;
          const current = edits[uc.id] ?? settings?.defaultModels?.[uc.id] ?? "";
          const currentModel = modelOptions.find((m) => m.id === current);
          return (
            <Card key={uc.id} className="p-4">
              <div className="mb-3 flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold">{uc.label}</h3>
                  <p className="truncate text-[11px] text-muted-foreground">{uc.desc}</p>
                </div>
              </div>
              <Select
                value={current || "_none"}
                onValueChange={(v) => {
                  const val = v === "_none" ? "" : v;
                  setEdits((s) => ({ ...s, [uc.id]: val }));
                }}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">— None —</SelectItem>
                  {modelOptions.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {currentModel && (
                <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Check className="h-3 w-3 text-emerald-500" />
                  <span className="font-mono">{current}</span>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <div className="flex items-center justify-end gap-3">
        {Object.keys(edits).length > 0 && (
          <span className="text-[11px] text-muted-foreground">
            {Object.keys(edits).length} unsaved change{Object.keys(edits).length !== 1 ? "s" : ""}
          </span>
        )}
        <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending || Object.keys(edits).length === 0} className="gap-2">
          {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Save defaults
        </Button>
      </div>
    </div>
  );
}

// ===========================================================================
// 4. USAGE
// ===========================================================================

function UsageSection() {
  const { data, isLoading } = useQuery<UsageResponse>({
    queryKey: ["ai-usage"],
    queryFn: () => api<UsageResponse>("/api/admin/usage"),
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="h-24 animate-pulse bg-muted/40" />
          ))}
        </div>
        <Card className="h-64 animate-pulse bg-muted/40" />
      </div>
    );
  }

  const t = data?.totals;
  const stats = [
    { label: "Total Requests", value: fmtNum(t?.totalRequests ?? 0), icon: Activity, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "Requests Today", value: fmtNum(t?.requestsToday ?? 0), icon: Zap, color: "text-teal-500", bg: "bg-teal-500/10" },
    { label: "Total Tokens", value: fmtNum(t?.totalTokens ?? 0), icon: Boxes, color: "text-violet-500", bg: "bg-violet-500/10" },
    { label: "Total Cost", value: fmtCost(t?.totalCost ?? 0), icon: TrendingUp, color: "text-amber-500", bg: "bg-amber-500/10" },
    { label: "Error Rate", value: `${(t?.errorRate ?? 0).toFixed(2)}%`, icon: AlertTriangle, color: t?.errorRate && t.errorRate > 5 ? "text-rose-500" : "text-orange-500", bg: "bg-orange-500/10" },
    { label: "Avg Latency", value: fmtMs(t?.avgLatency ?? 0), icon: Clock, color: "text-sky-500", bg: "bg-sky-500/10" },
  ];

  const series = data?.series ?? [];
  const maxReq = Math.max(...series.map((s) => s.requests), 1);

  return (
    <div className="space-y-3">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-6">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="p-3 sm:p-4">
              <div className={cn("mb-2 grid h-8 w-8 place-items-center rounded-lg", s.bg)}>
                <Icon className={cn("h-4 w-4", s.color)} />
              </div>
              <p className="text-base font-semibold tabular-nums sm:text-lg">{s.value}</p>
              <p className="text-[10px] text-muted-foreground sm:text-[11px]">{s.label}</p>
            </Card>
          );
        })}
      </div>

      {/* 7-day bar chart */}
      <Card className="p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Requests — last 7 days</h3>
            <p className="text-xs text-muted-foreground">Daily request volume across all providers</p>
          </div>
          <Badge variant="outline" className="gap-1.5">
            <BarChart3 className="h-3 w-3" /> Live
          </Badge>
        </div>
        {series.length === 0 ? (
          <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
            No usage data yet
          </div>
        ) : (
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/40" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} className="text-muted-foreground" tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" tickLine={false} axisLine={false} width={40} />
                <RechartsTooltip
                  cursor={{ fill: "hsl(var(--muted) / 0.3)" }}
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid hsl(var(--border))",
                    background: "hsl(var(--popover))",
                    fontSize: 12,
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === "requests") return [fmtNum(value), "Requests"];
                    if (name === "errors") return [fmtNum(value), "Errors"];
                    return [fmtNum(value), name];
                  }}
                />
                <Bar dataKey="requests" radius={[4, 4, 0, 0]} name="requests">
                  {series.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.requests === 0 ? "hsl(var(--muted))" : "hsl(var(--primary))"}
                    />
                  ))}
                </Bar>
                <Bar dataKey="errors" radius={[4, 4, 0, 0]} fill="hsl(var(--destructive))" name="errors" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        <div className="mt-2 flex items-center gap-4 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-primary" /> Requests
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-destructive" /> Errors
          </span>
          <span className="ml-auto tabular-nums">Peak: {fmtNum(maxReq)} req/day</span>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {/* By provider */}
        <Card className="overflow-hidden">
          <div className="border-b px-4 py-2.5">
            <h3 className="text-sm font-semibold">By provider</h3>
            <p className="text-[11px] text-muted-foreground">Requests, tokens & cost per provider</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Provider</th>
                  <th className="px-3 py-2 text-right font-medium">Requests</th>
                  <th className="hidden px-3 py-2 text-right font-medium sm:table-cell">Tokens</th>
                  <th className="px-3 py-2 text-right font-medium">Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(data?.byProvider ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-xs text-muted-foreground">
                      No provider data yet
                    </td>
                  </tr>
                ) : (
                  (data?.byProvider ?? []).map((p) => (
                    <tr key={p.provider} className="hover:bg-muted/30">
                      <td className="px-3 py-2 font-medium capitalize">{p.provider}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmtNum(p.requests)}</td>
                      <td className="hidden px-3 py-2 text-right tabular-nums text-muted-foreground sm:table-cell">
                        {fmtNum(p.tokens)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmtCost(p.cost)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* By model */}
        <Card className="overflow-hidden">
          <div className="border-b px-4 py-2.5">
            <h3 className="text-sm font-semibold">Top models</h3>
            <p className="text-[11px] text-muted-foreground">Top 10 models by request volume</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Model</th>
                  <th className="px-3 py-2 text-right font-medium">Requests</th>
                  <th className="hidden px-3 py-2 text-right font-medium sm:table-cell">Tokens</th>
                  <th className="px-3 py-2 text-right font-medium">Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(data?.byModel ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-xs text-muted-foreground">
                      No model data yet
                    </td>
                  </tr>
                ) : (
                  (data?.byModel ?? []).slice(0, 10).map((m) => (
                    <tr key={m.model} className="hover:bg-muted/30">
                      <td className="px-3 py-2 font-mono text-xs">{m.model}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmtNum(m.requests)}</td>
                      <td className="hidden px-3 py-2 text-right tabular-nums text-muted-foreground sm:table-cell">
                        {fmtNum(m.tokens)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmtCost(m.cost)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ===========================================================================
// 5. ROUTING
// ===========================================================================

function RoutingSection() {
  const qc = useQueryClient();
  const { data: settings, isLoading } = useQuery<PlatformSettings>({
    queryKey: ["ai-settings"],
    queryFn: () => api<PlatformSettings>("/api/admin/settings"),
  });

  // Local "edits" overlay on top of the persisted routingRules.
  type RouteRule = { primary: string; fallback: string };
  const [edits, setEdits] = useState<Record<string, RouteRule>>({});

  const cur = (ucId: string): RouteRule =>
    edits[ucId] ?? settings?.routingRules?.[ucId] ?? { primary: "", fallback: "" };
  const hasEdits = Object.keys(edits).length > 0;

  const save = useMutation({
    mutationFn: () => {
      const merged: Record<string, RouteRule> = { ...(settings?.routingRules ?? {}) };
      for (const uc of ROUTING_USE_CASES) {
        merged[uc.id] = cur(uc.id);
      }
      return api("/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({ routingRules: merged }),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-settings"] });
      setEdits({});
      toast.success("Routing rules saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const modelOptions = buildModelOptions(settings);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-md bg-muted/40" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Card className="flex items-start gap-2.5 p-3">
        <Route className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div className="text-xs text-muted-foreground">
          Define a <span className="font-medium text-foreground">primary</span> and a{" "}
          <span className="font-medium text-foreground">fallback</span> model for each use case. When the primary model
          fails or is unavailable, requests automatically fall through to the fallback.
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Use case</th>
                <th className="px-3 py-2 font-medium">Primary model</th>
                <th className="px-3 py-2 font-medium">Fallback model</th>
                <th className="hidden px-3 py-2 text-center font-medium md:table-cell">Flow</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {ROUTING_USE_CASES.map((uc) => {
                const c = cur(uc.id);
                return (
                  <tr key={uc.id} className="hover:bg-muted/30">
                    <td className="px-3 py-2.5 font-medium">{uc.label}</td>
                    <td className="px-3 py-2.5">
                      <Select
                        value={c.primary || "_none"}
                        onValueChange={(v) =>
                          setEdits((s) => ({
                            ...s,
                            [uc.id]: { ...cur(uc.id), primary: v === "_none" ? "" : v },
                          }))
                        }
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Select primary" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none">— None —</SelectItem>
                          {modelOptions.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-3 py-2.5">
                      <Select
                        value={c.fallback || "_none"}
                        onValueChange={(v) =>
                          setEdits((s) => ({
                            ...s,
                            [uc.id]: { ...cur(uc.id), fallback: v === "_none" ? "" : v },
                          }))
                        }
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Select fallback" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none">— None —</SelectItem>
                          {modelOptions.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="hidden px-3 py-2.5 text-center md:table-cell">
                      <div className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <span className="max-w-[100px] truncate font-mono">{c.primary || "—"}</span>
                        <ArrowRight className="h-3 w-3 shrink-0" />
                        <span className="max-w-[100px] truncate font-mono">{c.fallback || "—"}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="flex items-center justify-end gap-3">
        {hasEdits && (
          <span className="text-[11px] text-muted-foreground">
            {Object.keys(edits).length} unsaved change{Object.keys(edits).length !== 1 ? "s" : ""}
          </span>
        )}
        <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending || !hasEdits} className="gap-2">
          {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Save routing
        </Button>
      </div>
    </div>
  );
}

// ===========================================================================
// 6. CREDENTIALS
// ===========================================================================

function CredentialsSection() {
  const qc = useQueryClient();
  const { data: settings, isLoading } = useQuery<PlatformSettings>({
    queryKey: ["ai-settings"],
    queryFn: () => api<PlatformSettings>("/api/admin/settings"),
  });

  const [showAdd, setShowAdd] = useState(false);
  const [editingKey, setEditingKey] = useState<ApiKeyConfig | null>(null);

  const keys = settings?.apiKeys ?? [];

  const deleteKey = useMutation({
    mutationFn: (id: string) => {
      const next = keys.filter((k) => k.id !== id);
      return api("/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({ apiKeys: next }),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-settings"] });
      toast.success("Key deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setDefault = useMutation({
    mutationFn: (id: string) => {
      const next = keys.map((k) => ({ ...k, isDefault: k.id === id ? !k.isDefault : false }));
      return api("/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({ apiKeys: next }),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const roleBadge = (role: ApiKeyConfig["role"]) => {
    const map = {
      all: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
      chat: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      image: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    };
    return (
      <span className={cn("rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase", map[role])}>
        {role}
      </span>
    );
  };

  const providerName = (id: string) => AI_PROVIDERS.find((p) => p.id === id)?.name ?? id;

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-md bg-muted/40" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Security banner */}
      <div className="flex items-center gap-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3.5 py-2.5">
        <Lock className="h-4 w-4 shrink-0 text-emerald-500" />
        <div className="text-xs">
          <span className="font-medium text-emerald-700 dark:text-emerald-400">Encrypted at rest.</span>{" "}
          <span className="text-muted-foreground">
            API keys are masked in the UI and never returned in plaintext after saving.
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {keys.length} key{keys.length !== 1 ? "s" : ""} · {keys.filter((k) => k.isDefault).length} default
        </p>
        <Button size="sm" onClick={() => setShowAdd(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Add key
        </Button>
      </div>

      {keys.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-2 py-12 text-center">
          <KeyRound className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm font-medium">No API keys yet</p>
          <p className="text-xs text-muted-foreground">Add a key to start routing AI requests.</p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="divide-y">
            {keys.map((k) => (
              <div key={k.id} className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:gap-4 sm:p-4">
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                    <KeyRound className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-sm font-medium">{k.label}</p>
                      {k.isDefault && (
                        <Badge variant="outline" className="gap-1 border-amber-500/30 text-amber-600 dark:text-amber-400">
                          <Star className="h-2.5 w-2.5 fill-amber-500" /> Default
                        </Badge>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span className="font-mono">{k.apiKeyMasked || "••••••••"}</span>
                      <span>·</span>
                      <span>{providerName(k.provider)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {roleBadge(k.role)}
                  <Badge variant="outline" className="text-[10px]">
                    {providerName(k.provider)}
                  </Badge>
                </div>

                <div className="flex items-center gap-1 sm:ml-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1 px-2 text-[11px]"
                    onClick={() => setDefault.mutate(k.id)}
                    title={k.isDefault ? "Remove default" : "Set as default"}
                  >
                    <Star className={cn("h-3 w-3", k.isDefault ? "fill-amber-500 text-amber-500" : "")} />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1 px-2 text-[11px]"
                    onClick={() => setEditingKey(k)}
                    title="Edit key"
                  >
                    <Shield className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1 px-2 text-[11px] text-rose-600 hover:bg-rose-500/10 dark:text-rose-400"
                    onClick={() => {
                      if (confirm(`Delete key "${k.label}"? This cannot be undone.`)) deleteKey.mutate(k.id);
                    }}
                    title="Delete key"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {(showAdd || editingKey) && (
        <ApiKeyForm
          existing={editingKey}
          onClose={() => {
            setShowAdd(false);
            setEditingKey(null);
          }}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["ai-settings"] });
            setShowAdd(false);
            setEditingKey(null);
          }}
        />
      )}
    </div>
  );
}

function ApiKeyForm({
  existing,
  onClose,
  onSaved,
}: {
  existing: ApiKeyConfig | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    label: existing?.label ?? "",
    role: existing?.role ?? ("all" as ApiKeyConfig["role"]),
    provider: existing?.provider ?? "zai",
    baseUrl: existing?.baseUrl ?? AI_PROVIDERS.find((p) => p.id === "zai")!.baseUrl,
    apiKey: "",
    isDefault: existing?.isDefault ?? false,
    expiresAt: existing?.expiresAt ?? "",
  });
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);

  const onProviderChange = (id: string) => {
    const def = AI_PROVIDERS.find((p) => p.id === id);
    setForm((s) => ({ ...s, provider: id, baseUrl: def?.baseUrl || s.baseUrl }));
  };

  const save = async () => {
    if (!form.label.trim()) {
      toast.error("Label is required");
      return;
    }
    if (!existing && !form.apiKey.trim()) {
      toast.error("API key is required");
      return;
    }
    setSaving(true);
    try {
      const current = (await api<PlatformSettings>("/api/admin/settings")).apiKeys ?? [];
      const id = existing?.id ?? `key_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const entry: ApiKeyConfig = {
        id,
        label: form.label.trim(),
        role: form.role,
        provider: form.provider,
        baseUrl: form.baseUrl,
        apiKey: form.apiKey, // empty when editing = keep existing
        apiKeyMasked: existing?.apiKeyMasked ?? "",
        isDefault: form.isDefault,
        createdAt: existing?.createdAt ?? new Date().toISOString(),
        expiresAt: form.expiresAt || undefined,
      };
      // Ensure only one default per role scope (all | chat | image)
      const next = current
        .filter((k) => k.id !== id)
        .map((k) =>
          form.isDefault &&
          k.isDefault &&
          (k.role === form.role || k.role === "all" || form.role === "all")
            ? { ...k, isDefault: false }
            : k
        );
      next.push(entry);
      await api("/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({ apiKeys: next }),
      });
      toast.success(existing ? "Key updated" : "Key added");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-primary" />
            {existing ? "Edit API key" : "Add API key"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Label *</Label>
            <Input
              value={form.label}
              onChange={(e) => setForm((s) => ({ ...s, label: e.target.value }))}
              placeholder="e.g. Z.ai Production"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm((s) => ({ ...s, role: v as ApiKeyConfig["role"] }))}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
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
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AI_PROVIDERS.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Base URL</Label>
            <Input
              value={form.baseUrl}
              onChange={(e) => setForm((s) => ({ ...s, baseUrl: e.target.value }))}
              placeholder="https://api.example.com/v1"
              className="font-mono text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              API key {existing && <span className="text-muted-foreground/70">(leave blank to keep existing)</span>}
            </Label>
            <div className="relative">
              <Input
                type={showKey ? "text" : "password"}
                value={form.apiKey}
                onChange={(e) => setForm((s) => ({ ...s, apiKey: e.target.value }))}
                placeholder="sk-xxxxxxxxxxxxxxxx"
                className="pr-9 font-mono text-xs"
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Expiration (optional)</Label>
            <Input
              type="date"
              value={form.expiresAt}
              onChange={(e) => setForm((s) => ({ ...s, expiresAt: e.target.value }))}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-2.5">
            <div>
              <p className="text-xs font-medium">Default for this role</p>
              <p className="text-[11px] text-muted-foreground">Use this key by default for the selected role</p>
            </div>
            <Switch checked={form.isDefault} onCheckedChange={(v) => setForm((s) => ({ ...s, isDefault: v }))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={save} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {existing ? "Save changes" : "Add key"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ===========================================================================
// 7. LIMITS
// ===========================================================================

function LimitsSection() {
  const qc = useQueryClient();
  const { data: settings, isLoading } = useQuery<PlatformSettings>({
    queryKey: ["ai-settings"],
    queryFn: () => api<PlatformSettings>("/api/admin/settings"),
  });

  // Effective limits = persisted settings overlaid with local edits.
  // No syncing effect — values read from settings, then edits.
  const persisted: AiLimits = { ...DEFAULT_LIMITS, ...(settings?.aiLimits ?? {}) };
  const [edits, setEdits] = useState<Partial<AiLimits>>({});
  const draft: AiLimits = { ...persisted, ...edits };
  const hasEdits = Object.keys(edits).length > 0;

  const save = useMutation({
    mutationFn: () =>
      api("/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({ aiLimits: draft }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-settings"] });
      setEdits({});
      toast.success("Limits saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Simulated current usage for the approaching-limit warning
  const simulated = {
    monthlySpend: 412.5,
    dailySpend: 18.2,
    concurrent: 38,
    requestsToday: 6420,
  };
  const monthlyPct = (simulated.monthlySpend / draft.monthlyBudget) * 100;
  const dailyPct = (simulated.dailySpend / draft.dailyBudget) * 100;
  const concurrentPct = (simulated.concurrent / draft.maxConcurrentRequests) * 100;
  const reqPct = (simulated.requestsToday / draft.maxRequestsPerDay) * 100;
  const approaching = [monthlyPct, dailyPct, concurrentPct, reqPct].some((p) => p >= 80);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="h-24 animate-pulse bg-muted/40" />
        ))}
      </div>
    );
  }

  const fields: { key: keyof AiLimits; label: string; prefix?: string; suffix?: string; hint?: string }[] = [
    { key: "monthlyBudget", label: "Monthly Budget", prefix: "$", hint: "Total platform spend cap per month" },
    { key: "dailyBudget", label: "Daily Budget", prefix: "$", hint: "Spend cap per day" },
    { key: "maxTokensPerRequest", label: "Max Tokens / Request", suffix: "tok", hint: "Single-request token ceiling" },
    { key: "maxRequestsPerDay", label: "Max Requests / Day", suffix: "req", hint: "Platform-wide daily request cap" },
    { key: "maxConcurrentRequests", label: "Max Concurrent", suffix: "req", hint: "In-flight requests at once" },
    { key: "perUserDailyLimit", label: "Per-User Daily", suffix: "req", hint: "Per user, per day" },
    { key: "perProjectDailyLimit", label: "Per-Project Daily", suffix: "req", hint: "Per project, per day" },
    { key: "perAgentDailyLimit", label: "Per-Agent Daily", suffix: "req", hint: "Per AI employee, per day" },
  ];

  return (
    <div className="space-y-3">
      {/* Approaching-limit warning */}
      {approaching && (
        <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3.5 py-2.5">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <div className="text-xs text-amber-700 dark:text-amber-400">
            <span className="font-medium">Approaching limits.</span> One or more limits are above 80% of their cap
            based on current usage. Consider raising the cap or routing traffic to a fallback provider.
          </div>
        </div>
      )}

      {/* Simulated usage bars */}
      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Current usage (simulated)</h3>
          <Badge variant="outline" className="gap-1 text-[10px]">
            <Activity className="h-3 w-3" /> Live snapshot
          </Badge>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Monthly", value: simulated.monthlySpend, max: draft.monthlyBudget, pct: monthlyPct, prefix: "$" },
            { label: "Today", value: simulated.dailySpend, max: draft.dailyBudget, pct: dailyPct, prefix: "$" },
            { label: "Concurrent", value: simulated.concurrent, max: draft.maxConcurrentRequests, pct: concurrentPct },
            { label: "Requests today", value: simulated.requestsToday, max: draft.maxRequestsPerDay, pct: reqPct },
          ].map((m) => (
            <div key={m.label}>
              <div className="mb-1 flex items-baseline justify-between text-[11px]">
                <span className="text-muted-foreground">{m.label}</span>
                <span className="tabular-nums font-medium">
                  {m.prefix}
                  {fmtNum(m.value)} / {m.prefix}
                  {fmtNum(m.max)}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    m.pct >= 90 ? "bg-rose-500" : m.pct >= 80 ? "bg-amber-500" : "bg-emerald-500"
                  )}
                  style={{ width: `${Math.min(100, m.pct)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Limit inputs */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {fields.map((f) => (
          <Card key={f.key} className="p-4">
            <Label className="text-[11px] font-medium text-muted-foreground">{f.label}</Label>
            <div className="mt-2 flex items-center gap-1">
              {f.prefix && <span className="text-sm font-medium text-muted-foreground">{f.prefix}</span>}
              <Input
                type="number"
                value={draft[f.key]}
                onChange={(e) => setEdits((s) => ({ ...s, [f.key]: Number(e.target.value) }))}
                className="h-8 tabular-nums text-sm"
              />
              {f.suffix && <span className="text-[11px] text-muted-foreground">{f.suffix}</span>}
            </div>
            {f.hint && <p className="mt-1.5 text-[10px] text-muted-foreground">{f.hint}</p>}
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-end gap-3">
        {hasEdits && (
          <span className="text-[11px] text-muted-foreground">
            {Object.keys(edits).length} unsaved change{Object.keys(edits).length !== 1 ? "s" : ""}
          </span>
        )}
        <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending || !hasEdits} className="gap-2">
          {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Save limits
        </Button>
      </div>
    </div>
  );
}

// ===========================================================================
// 8. LOGS
// ===========================================================================

function LogsSection() {
  const [provider, setProvider] = useState("all");
  const [type, setType] = useState("all");
  const [success, setSuccess] = useState("all");
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(100);

  const params = new URLSearchParams();
  if (provider !== "all") params.set("provider", provider);
  if (type !== "all") params.set("type", type);
  if (success !== "all") params.set("success", success);
  params.set("limit", String(limit));

  const { data, isLoading } = useQuery<{ logs: AiUsageLog[]; count: number }>({
    queryKey: ["ai-logs", provider, type, success, limit],
    queryFn: () => api(`/api/admin/ai-logs?${params.toString()}`),
  });

  const logs = data?.logs ?? [];

  // Client-side search across provider/model/type/error
  const filtered = useMemo(() => {
    if (!search.trim()) return logs;
    const q = search.toLowerCase();
    return logs.filter(
      (l) =>
        l.provider.toLowerCase().includes(q) ||
        l.model.toLowerCase().includes(q) ||
        l.requestType.toLowerCase().includes(q) ||
        (l.errorMessage ?? "").toLowerCase().includes(q)
    );
  }, [logs, search]);

  const exportCsv = () => {
    const headers = [
      "Timestamp",
      "Provider",
      "Model",
      "Type",
      "Prompt tokens",
      "Completion tokens",
      "Total tokens",
      "Cost",
      "Duration (ms)",
      "Streaming",
      "Success",
      "Error",
    ];
    const rows = filtered.map((l) => [
      new Date(l.createdAt).toISOString(),
      l.provider,
      l.model,
      l.requestType,
      l.promptTokens,
      l.completionTokens,
      l.totalTokens,
      l.cost,
      l.durationMs,
      l.streaming ? "yes" : "no",
      l.success ? "yes" : "no",
      (l.errorMessage ?? "").replace(/"/g, '""'),
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${c}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ai-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} logs`);
  };

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search provider, model, type, error…"
            className="pl-8"
          />
        </div>
        <Select value={provider} onValueChange={setProvider}>
          <SelectTrigger className="w-full lg:w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All providers</SelectItem>
            {AI_PROVIDERS.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-full lg:w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="chat">Chat</SelectItem>
            <SelectItem value="image">Image</SelectItem>
            <SelectItem value="document">Document</SelectItem>
            <SelectItem value="embedding">Embedding</SelectItem>
          </SelectContent>
        </Select>
        <Select value={success} onValueChange={setSuccess}>
          <SelectTrigger className="w-full lg:w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="true">Success</SelectItem>
            <SelectItem value="false">Failed</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" className="gap-2" onClick={exportCsv} disabled={filtered.length === 0}>
          <Download className="h-3.5 w-3.5" /> Export CSV
        </Button>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Timestamp</th>
                <th className="px-3 py-2 font-medium">Provider</th>
                <th className="hidden px-3 py-2 font-medium md:table-cell">Model</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="hidden px-3 py-2 text-right font-medium sm:table-cell">Tokens</th>
                <th className="hidden px-3 py-2 text-right font-medium sm:table-cell">Cost</th>
                <th className="px-3 py-2 text-right font-medium">Duration</th>
                <th className="px-3 py-2 text-center font-medium">Status</th>
                <th className="hidden px-3 py-2 font-medium lg:table-cell">Error</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={9} className="px-3 py-3">
                      <div className="h-4 animate-pulse rounded bg-muted/50" />
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-10 text-center text-xs text-muted-foreground">
                    No logs match the current filters.
                  </td>
                </tr>
              ) : (
                filtered.map((l) => (
                  <tr key={l.id} className="hover:bg-muted/30">
                    <td className="whitespace-nowrap px-3 py-2 text-[11px] text-muted-foreground tabular-nums">
                      {new Date(l.createdAt).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>
                    <td className="px-3 py-2 text-xs font-medium capitalize">{l.provider}</td>
                    <td className="hidden px-3 py-2 font-mono text-[11px] md:table-cell">{l.model}</td>
                    <td className="px-3 py-2">
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {l.requestType}
                      </Badge>
                      {l.streaming && (
                        <Badge variant="outline" className="ml-1 text-[10px] text-primary">
                          <Zap className="mr-1 h-2 w-2" /> stream
                        </Badge>
                      )}
                    </td>
                    <td className="hidden px-3 py-2 text-right text-xs tabular-nums text-muted-foreground sm:table-cell">
                      {fmtNum(l.totalTokens)}
                    </td>
                    <td className="hidden px-3 py-2 text-right text-xs tabular-nums sm:table-cell">
                      {fmtCost(l.cost)}
                    </td>
                    <td className="px-3 py-2 text-right text-xs tabular-nums text-muted-foreground">
                      {fmtMs(l.durationMs)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {l.success ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                          <Check className="h-2.5 w-2.5" /> OK
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-medium text-rose-600 dark:text-rose-400">
                          <X className="h-2.5 w-2.5" /> Fail
                        </span>
                      )}
                    </td>
                    <td className="hidden max-w-[240px] truncate px-3 py-2 text-[11px] text-rose-500 lg:table-cell" title={l.errorMessage ?? ""}>
                      {l.errorMessage || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t px-3 py-2 text-[11px] text-muted-foreground">
          <span>
            Showing {filtered.length} of {data?.count ?? 0} logs
          </span>
          {filtered.length >= limit && (
            <Button size="sm" variant="outline" className="h-7 gap-1 text-[11px]" onClick={() => setLimit((l) => l + 100)}>
              Load more <ChevronRight className="h-3 w-3" />
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}

// ===========================================================================
// 9. HEALTH
// ===========================================================================

function HealthSection({ onOpenModels }: { onOpenModels: (id: string) => void }) {
  const qc = useQueryClient();
  const [checkingAll, setCheckingAll] = useState(false);
  const [checkingId, setCheckingId] = useState<string | null>(null);

  const { data: providers = [], isLoading } = useQuery<ConfiguredProvider[]>({
    queryKey: ["ai-providers"],
    queryFn: () => api<{ providers: ConfiguredProvider[] }>("/api/admin/providers").then((r) => r.providers),
  });

  const { data: usage } = useQuery<UsageResponse>({
    queryKey: ["ai-usage"],
    queryFn: () => api<UsageResponse>("/api/admin/usage"),
  });

  // Derive per-provider health from recent logs
  const healthByProvider = useMemo(() => {
    const map: Record<string, {
      lastSuccess: string | null;
      lastFailure: string | null;
      consecutiveFailures: number;
      avgLatency: number;
      total: number;
      successCount: number;
      uptime: number;
    }> = {};
    const recent = usage?.recent ?? [];
    for (const log of recent) {
      const p = log.provider;
      if (!map[p]) map[p] = { lastSuccess: null, lastFailure: null, consecutiveFailures: 0, avgLatency: 0, total: 0, successCount: 0, uptime: 100 };
      map[p].total++;
      if (log.success) {
        map[p].successCount++;
        if (!map[p].lastSuccess || new Date(log.createdAt) > new Date(map[p].lastSuccess)) {
          map[p].lastSuccess = log.createdAt;
        }
      } else {
        if (!map[p].lastFailure || new Date(log.createdAt) > new Date(map[p].lastFailure)) {
          map[p].lastFailure = log.createdAt;
        }
      }
    }
    // Compute uptime + consecutive failures + avg latency
    for (const p of Object.keys(map)) {
      const logs = recent.filter((l) => l.provider === p).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      const h = map[p];
      h.uptime = h.total > 0 ? (h.successCount / h.total) * 100 : 100;
      h.avgLatency = h.total > 0 ? Math.round(logs.reduce((a, l) => a + l.durationMs, 0) / h.total) : 0;
      // Count trailing failures
      let cf = 0;
      for (let i = logs.length - 1; i >= 0; i--) {
        if (!logs[i].success) cf++;
        else break;
      }
      h.consecutiveFailures = cf;
    }
    return map;
  }, [usage]);

  const checkOne = async (id: string) => {
    setCheckingId(id);
    try {
      const res = await api<TestResult>(`/api/admin/providers/${id}/test`, { method: "POST" });
      if (res.success) {
        toast.success(`Health check OK · ${fmtMs(res.latencyMs)}`);
      } else {
        toast.error(res.error || "Health check failed");
      }
      qc.invalidateQueries({ queryKey: ["ai-providers"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Check failed");
    } finally {
      setCheckingId(null);
    }
  };

  const checkAll = async () => {
    setCheckingAll(true);
    let ok = 0;
    let fail = 0;
    for (const p of providers.filter((p) => p.hasKey)) {
      try {
        const res = await api<TestResult>(`/api/admin/providers/${p.id}/test`, { method: "POST" });
        if (res.success) ok++;
        else fail++;
      } catch {
        fail++;
      }
    }
    qc.invalidateQueries({ queryKey: ["ai-providers"] });
    toast.success(`Checked ${ok + fail} providers · ${ok} healthy · ${fail} failing`);
    setCheckingAll(false);
  };

  const healthColor = (p: ConfiguredProvider) => {
    if (p.status === "unconfigured") return "muted";
    const h = healthByProvider[p.id];
    if (p.lastTestSuccess === false) return "red";
    if (h && h.consecutiveFailures >= 3) return "red";
    if (h && h.uptime < 95) return "amber";
    if (p.status === "inactive") return "amber";
    return "green";
  };

  const dotClass = (c: string) =>
    c === "green"
      ? "bg-emerald-500"
      : c === "amber"
      ? "bg-amber-500"
      : c === "red"
      ? "bg-rose-500"
      : "bg-muted-foreground/40";

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="h-40 animate-pulse bg-muted/40" />
        ))}
      </div>
    );
  }

  const configuredProviders = providers.filter((p) => p.hasKey || p.authScheme === "none");

  return (
    <div className="space-y-3">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {configuredProviders.length} configured providers ·{" "}
          <span className="text-emerald-600 dark:text-emerald-400">
            {configuredProviders.filter((p) => healthColor(p) === "green").length} healthy
          </span>{" "}
          ·{" "}
          <span className="text-amber-600 dark:text-amber-400">
            {configuredProviders.filter((p) => healthColor(p) === "amber").length} degraded
          </span>{" "}
          ·{" "}
          <span className="text-rose-600 dark:text-rose-400">
            {configuredProviders.filter((p) => healthColor(p) === "red").length} failing
          </span>
        </p>
        <Button size="sm" onClick={checkAll} disabled={checkingAll} className="gap-2">
          {checkingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
          Check all
        </Button>
      </div>

      {/* Provider health grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {configuredProviders.map((p) => {
          const color = healthColor(p);
          const h = healthByProvider[p.id];
          return (
            <Card key={p.id} className="p-4">
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", dotClass(color))} />
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold">{p.name}</h3>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {p.status === "inactive" ? "Inactive" : p.status === "unconfigured" ? "Unconfigured" : "Active"}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1 px-2 text-[11px]"
                  onClick={() => checkOne(p.id)}
                  disabled={checkingId === p.id || checkingAll}
                >
                  {checkingId === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                  Check
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Uptime</p>
                  <p className={cn("font-semibold tabular-nums", color === "green" ? "text-emerald-600 dark:text-emerald-400" : color === "amber" ? "text-amber-600 dark:text-amber-400" : color === "red" ? "text-rose-600 dark:text-rose-400" : "")}>
                    {h ? `${h.uptime.toFixed(1)}%` : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Avg latency</p>
                  <p className="font-semibold tabular-nums">{h ? fmtMs(h.avgLatency) : "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Last success</p>
                  <p className="tabular-nums text-muted-foreground">{h?.lastSuccess ? timeAgo(h.lastSuccess) : "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Last failure</p>
                  <p className="tabular-nums text-muted-foreground">{h?.lastFailure ? timeAgo(h.lastFailure) : "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Failures (streak)</p>
                  <p className={cn("font-semibold tabular-nums", (h?.consecutiveFailures ?? 0) >= 3 ? "text-rose-600 dark:text-rose-400" : "")}>
                    {h?.consecutiveFailures ?? 0}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Last test</p>
                  <p className="tabular-nums text-muted-foreground">
                    {p.lastTestedAt ? timeAgo(p.lastTestedAt) : "—"}
                  </p>
                </div>
              </div>

              {p.lastTestError && (
                <div className="mt-2 truncate rounded-md bg-rose-500/5 px-2 py-1 text-[10px] text-rose-600 dark:text-rose-400" title={p.lastTestError}>
                  {p.lastTestError}
                </div>
              )}

              <div className="mt-3 flex items-center gap-1.5 border-t pt-2.5">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 gap-1 px-2 text-[11px]"
                  onClick={() => onOpenModels(p.id)}
                  disabled={!p.modelsEndpoint}
                >
                  <Cpu className="h-3 w-3" /> Models
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 gap-1 px-2 text-[11px]"
                  onClick={() => checkOne(p.id)}
                  disabled={checkingId === p.id}
                >
                  <Zap className="h-3 w-3" /> Re-test
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* 7-day health timeline */}
      <Card className="p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Health timeline — last 7 days</h3>
            <p className="text-xs text-muted-foreground">Daily request volume vs. errors across all providers</p>
          </div>
          <Badge variant="outline" className="gap-1.5">
            <Activity className="h-3 w-3" /> 7d
          </Badge>
        </div>
        {(usage?.series ?? []).length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
            No usage data for the timeline yet
          </div>
        ) : (
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={usage?.series ?? []} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/40" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} className="text-muted-foreground" tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" tickLine={false} axisLine={false} width={40} />
                <RechartsTooltip
                  cursor={{ fill: "hsl(var(--muted) / 0.3)" }}
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid hsl(var(--border))",
                    background: "hsl(var(--popover))",
                    fontSize: 12,
                  }}
                  formatter={(value: number, name: string) =>
                    name === "errors" ? [fmtNum(value), "Errors"] : [fmtNum(value), "Requests"]
                  }
                />
                <Bar dataKey="requests" radius={[4, 4, 0, 0]} fill="hsl(var(--primary))" name="requests" />
                <Bar dataKey="errors" radius={[4, 4, 0, 0]} fill="hsl(var(--destructive))" name="errors" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        <div className="mt-2 flex items-center gap-4 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-primary" /> Requests
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-destructive" /> Errors
          </span>
          <span className="ml-auto inline-flex items-center gap-1.5">
            <TrendingDown className="h-3 w-3" /> Healthy when errors &lt; 5% of requests
          </span>
        </div>
      </Card>
    </div>
  );
}
