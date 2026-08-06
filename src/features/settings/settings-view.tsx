"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { PLANS } from "@/lib/constants";
import {
  Settings as SettingsIcon,
  User,
  Palette,
  Key,
  Shield,
  Plus,
  Trash2,
  Check,
  Star,
  Loader2,
  Sparkles,
  AlertTriangle,
  Crown,
  Users,
  DollarSign,
  Activity,
  Search,
  Ban,
  Unlock,
  Zap,
  TrendingUp,
  Mail,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { useWorkspace } from "@/store/workspace";

interface BrandVoice {
  id: string;
  name: string;
  description: string | null;
  tone: string;
  vocabulary: string | null;
  avoidWords: string | null;
  sampleCopy: string | null;
  isDefault: boolean;
  updatedAt: string;
}

type TabId = "account" | "brand-voices" | "api-keys" | "admin" | "danger";

const TONE_PRESETS = [
  "professional, confident",
  "friendly, warm, casual",
  "bold, punchy, energetic",
  "authoritative, expert",
  "playful, witty",
  "empathetic, supportive",
];

export function SettingsView() {
  const { data: user } = useCurrentUser();
  const [activeTab, setActiveTab] = useState<TabId>("account");

  const tabs: { id: TabId; label: string; icon: typeof User; adminOnly?: boolean; desc: string }[] = [
    { id: "account", label: "Account", icon: User, desc: "Profile, plan & preferences" },
    { id: "brand-voices", label: "Brand Voice", icon: Palette, desc: "Reusable tone profiles" },
    { id: "api-keys", label: "API Keys", icon: Key, desc: "Programmatic access" },
    { id: "admin", label: "Super Admin", icon: Crown, adminOnly: true, desc: "Platform control center" },
    { id: "danger", label: "Danger Zone", icon: AlertTriangle, desc: "Irreversible actions" },
  ];

  const visibleTabs = tabs.filter((t) => !t.adminOnly || user?.isAdmin);
  const activeMeta = visibleTabs.find((t) => t.id === activeTab);

  return (
    <div className="mx-auto w-full max-w-6xl px-3 py-4 sm:px-4 sm:py-6 md:px-6 md:py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold tracking-tight md:text-2xl">Settings</h2>
          {user?.isAdmin && (
            <Badge className="gap-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white">
              <Crown className="h-3 w-3" /> Super Admin
            </Badge>
          )}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account, brand voice, API access and workspace preferences.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-[220px_1fr] lg:gap-6">
        {/* Tab nav */}
        <nav className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
          {visibleTabs.map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={cn(
                  "group flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors md:w-full",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className={cn("h-4 w-4", active && "text-primary")} />
                <span className="whitespace-nowrap">{t.label}</span>
                {t.adminOnly && (
                  <Crown className="ml-auto hidden h-3 w-3 text-amber-500 md:block" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Tab content */}
        <div className="min-w-0">
          {/* Active tab heading */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
            >
              {activeMeta && (
                <div className="mb-4 flex items-center gap-2.5">
                  <div className={cn(
                    "grid h-8 w-8 place-items-center rounded-lg",
                    activeTab === activeMeta.id ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  )}>
                    <activeMeta.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold leading-tight">{activeMeta.label}</h3>
                    <p className="text-xs text-muted-foreground">{activeMeta.desc}</p>
                  </div>
                </div>
              )}

              {activeTab === "account" && <AccountTab user={user} />}
              {activeTab === "brand-voices" && <BrandVoiceTab plan={user?.plan ?? "free"} />}
              {activeTab === "api-keys" && <ApiKeysTab plan={user?.plan ?? "free"} />}
              {activeTab === "admin" && user?.isAdmin && <AdminTab />}
              {activeTab === "danger" && <DangerTab />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
function AccountTab({ user }: { user?: { name: string; email: string; plan: string; credits: number; isAdmin?: boolean } }) {
  const plan = PLANS.find((p) => p.id === (user?.plan ?? "free")) ?? PLANS[0];
  const { setActiveModule } = useWorkspace();
  return (
    <div className="space-y-4">
      <Card className="p-4 sm:p-5">
        <h3 className="mb-4 text-sm font-semibold sm:text-base">Profile</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Full name</Label>
            <Input defaultValue={user?.name} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Email</Label>
            <Input defaultValue={user?.email} disabled className="bg-muted/50" />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button size="sm" onClick={() => toast.success("Profile saved (demo)")}>Save changes</Button>
        </div>
      </Card>

      <Card className="p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold sm:text-base">Current plan</h3>
            <p className="text-sm text-muted-foreground">{plan.tagline}</p>
          </div>
          <Badge variant="secondary" className="gap-1">
            <Star className="h-3 w-3" /> {plan.name}
          </Badge>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
          <Stat label="Credits" value={(user?.credits ?? 0).toLocaleString()} />
          <Stat label="Price" value={`$${plan.price}/mo`} />
          <Stat label="Plan credits" value={plan.credits.toLocaleString()} />
          <Stat label="Cadence" value={plan.cadence} />
        </div>
        <Button variant="outline" size="sm" className="mt-4 w-full sm:w-auto" onClick={() => setActiveModule("billing")}>
          Manage subscription
        </Button>
      </Card>

      <Card className="p-4 sm:p-5">
        <h3 className="mb-3 text-sm font-semibold sm:text-base">Preferences</h3>
        <div className="space-y-4">
          <PrefRow label="Email notifications" desc="Product updates, tips and billing alerts" defaultChecked />
          <Separator />
          <PrefRow label="Marketing emails" desc="Occasional offers and new feature announcements" />
          <Separator />
          <PrefRow label="Usage alerts" desc="Notify me at 80% and 95% credit usage" defaultChecked />
        </div>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
function BrandVoiceTab({ plan }: { plan: string }) {
  const qc = useQueryClient();
  const { openPaywall } = useWorkspace();
  const [editing, setEditing] = useState<BrandVoice | null>(null);
  const [creating, setCreating] = useState(false);

  const { data: voices = [] } = useQuery<BrandVoice[]>({
    queryKey: ["brand-voices"],
    queryFn: () => api<BrandVoice[]>("/api/brand-voices"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api(`/api/brand-voices/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["brand-voices"] });
      toast.success("Brand voice deleted");
    },
  });

  const setDefault = useMutation({
    mutationFn: ({ id, isDefault }: { id: string; isDefault: boolean }) =>
      api(`/api/brand-voices/${id}`, { method: "PATCH", body: JSON.stringify({ isDefault }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["brand-voices"] });
      toast.success("Default brand voice updated");
    },
  });

  const limit = plan === "free" ? 0 : plan === "starter" ? 1 : plan === "pro" ? 10 : Infinity;
  const atLimit = voices.length >= limit;

  const startCreate = () => {
    if (atLimit) {
      openPaywall("brand-voice");
      return;
    }
    setCreating(true);
  };

  if (creating || editing) {
    return (
      <BrandVoiceEditor
        voice={editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <Card className="relative overflow-hidden p-4 sm:p-5">
        <div className="absolute -top-12 -right-12 hidden h-32 w-32 rounded-full bg-primary/10 blur-2xl sm:block" />
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold sm:text-base">Brand Voice profiles</h3>
              <Badge variant="outline">{voices.length} / {limit === Infinity ? "∞" : limit}</Badge>
            </div>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Define how NexusAI writes for your brand. Saved voices auto-apply to documents, emails and marketing copy.
            </p>
          </div>
          <Button onClick={startCreate} className="gap-2 shrink-0" size="sm">
            <Plus className="h-4 w-4" /> New voice
          </Button>
        </div>
      </Card>

      {voices.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-3 p-8 text-center sm:p-10">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10">
            <Palette className="h-7 w-7 text-primary" />
          </div>
          <div>
            <p className="font-medium">No brand voices yet</p>
            <p className="mt-0.5 max-w-xs text-sm text-muted-foreground">
              {plan === "free"
                ? "Brand Voice is a Pro feature. Upgrade to make NexusAI sound exactly like your brand."
                : "Create your first voice profile to keep your content on-brand everywhere."}
            </p>
          </div>
          {plan === "free" ? (
            <Button variant="outline" size="sm" onClick={() => openPaywall("brand-voice")}>
              <Sparkles className="mr-1.5 h-4 w-4" /> Unlock with Pro
            </Button>
          ) : (
            <Button size="sm" onClick={startCreate}>
              <Plus className="mr-1.5 h-4 w-4" /> Create voice
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {voices.map((v, i) => (
            <motion.div
              key={v.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Card className="group relative h-full p-4 transition-all hover:shadow-md">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium">{v.name}</p>
                      {v.isDefault && (
                        <Badge variant="secondary" className="gap-1 text-[10px]">
                          <Star className="h-2.5 w-2.5" /> Default
                        </Badge>
                      )}
                    </div>
                    {v.description && (
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{v.description}</p>
                    )}
                  </div>
                </div>
                <div className="mt-3 space-y-1.5 text-xs">
                  <div className="flex gap-2">
                    <span className="w-16 shrink-0 text-muted-foreground">Tone</span>
                    <span className="truncate">{v.tone}</span>
                  </div>
                  {v.vocabulary && (
                    <div className="flex gap-2">
                      <span className="w-16 shrink-0 text-muted-foreground">Vocab</span>
                      <span className="truncate">{v.vocabulary}</span>
                    </div>
                  )}
                  {v.avoidWords && (
                    <div className="flex gap-2">
                      <span className="w-16 shrink-0 text-muted-foreground">Avoid</span>
                      <span className="truncate text-rose-500">{v.avoidWords}</span>
                    </div>
                  )}
                </div>
                <div className="mt-3 flex items-center gap-1 border-t pt-3">
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setEditing(v)}>
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setDefault.mutate({ id: v.id, isDefault: !v.isDefault })}
                  >
                    {v.isDefault ? "Remove default" : "Set as default"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto h-7 text-xs text-destructive hover:text-destructive"
                    onClick={() => remove.mutate(v.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function BrandVoiceEditor({ voice, onClose }: { voice: BrandVoice | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: voice?.name ?? "",
    description: voice?.description ?? "",
    tone: voice?.tone ?? "professional, confident",
    vocabulary: voice?.vocabulary ?? "",
    avoidWords: voice?.avoidWords ?? "",
    sampleCopy: voice?.sampleCopy ?? "",
    isDefault: voice?.isDefault ?? false,
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      if (voice) {
        await api(`/api/brand-voices/${voice.id}`, { method: "PATCH", body: JSON.stringify(form) });
        toast.success("Brand voice updated");
      } else {
        await api("/api/brand-voices", { method: "POST", body: JSON.stringify(form) });
        toast.success("Brand voice created");
      }
      qc.invalidateQueries({ queryKey: ["brand-voices"] });
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const field = (key: keyof typeof form, label: string, opts?: { placeholder?: string; textarea?: boolean }) => (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {opts?.textarea ? (
        <Textarea
          value={form[key] as string}
          onChange={(e) => setForm((s) => ({ ...s, [key]: e.target.value }))}
          placeholder={opts.placeholder}
          rows={3}
        />
      ) : (
        <Input
          value={form[key] as string}
          onChange={(e) => setForm((s) => ({ ...s, [key]: e.target.value }))}
          placeholder={opts?.placeholder}
        />
      )}
    </div>
  );

  return (
    <Card className="p-4 sm:p-5 md:p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold sm:text-base">{voice ? "Edit brand voice" : "New brand voice"}</h3>
          <p className="text-xs text-muted-foreground">Define the tone, vocabulary and style NexusAI should follow.</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
      </div>

      <div className="space-y-4">
        {field("name", "Voice name *", { placeholder: "e.g. NexusAI — Bold & friendly" })}
        {field("description", "Description", { placeholder: "For our SaaS landing page and emails" })}

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Tone</Label>
          <Input
            value={form.tone}
            onChange={(e) => setForm((s) => ({ ...s, tone: e.target.value }))}
            placeholder="professional, confident"
          />
          <div className="flex flex-wrap gap-1.5 pt-1">
            {TONE_PRESETS.map((t) => (
              <button
                key={t}
                onClick={() => setForm((s) => ({ ...s, tone: t }))}
                className={cn(
                  "rounded-full border px-2.5 py-0.5 text-[11px] transition-colors",
                  form.tone === t ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {field("vocabulary", "Preferred vocabulary", { placeholder: "nexus, workspace, ship, scale" })}
          {field("avoidWords", "Words to avoid", { placeholder: "cheap, hack, synergy" })}
        </div>

        {field("sampleCopy", "Sample copy (reference)", {
          placeholder: "Paste 1–2 paragraphs that capture your voice perfectly.",
          textarea: true,
        })}

        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="text-sm font-medium">Set as default</p>
            <p className="text-xs text-muted-foreground">Auto-apply this voice to new generations.</p>
          </div>
          <Switch checked={form.isDefault} onCheckedChange={(v) => setForm((s) => ({ ...s, isDefault: v }))} />
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={save} disabled={saving} size="sm" className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {saving ? "Saving…" : "Save voice"}
        </Button>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
function ApiKeysTab({ plan }: { plan: string }) {
  const { openPaywall } = useWorkspace();
  const allowed = plan === "pro" || plan === "agency";

  if (!allowed) {
    return (
      <Card className="flex flex-col items-center justify-center gap-3 p-8 text-center sm:p-10">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10">
          <Key className="h-7 w-7 text-primary" />
        </div>
        <div>
          <p className="font-medium">API access is a Pro feature</p>
          <p className="mt-0.5 max-w-xs text-sm text-muted-foreground">
            Build automations and integrate NexusAI into your stack with scoped API keys.
          </p>
        </div>
        <Button size="sm" onClick={() => openPaywall("api-keys")}>
          <Sparkles className="mr-1.5 h-4 w-4" /> Upgrade to Pro
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold sm:text-base">API Keys</h3>
            <p className="text-sm text-muted-foreground">Programmatic access to NexusAI.</p>
          </div>
          <Button className="gap-2 shrink-0" size="sm" onClick={() => toast.success("API key created (demo)")}>
            <Plus className="h-4 w-4" /> Create key
          </Button>
        </div>
      </Card>
      <Card className="p-5">
        <p className="text-sm text-muted-foreground">No API keys yet. Create one to start building.</p>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SUPER ADMIN TAB
// ---------------------------------------------------------------------------
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

function AdminTab() {
  const [section, setSection] = useState<"overview" | "users" | "system">("overview");

  const sections = [
    { id: "overview" as const, label: "Overview", icon: Activity },
    { id: "users" as const, label: "Users", icon: Users },
    { id: "system" as const, label: "System", icon: Shield },
  ];

  return (
    <div className="space-y-4">
      {/* Admin warning banner */}
      <div className="flex items-center gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2.5">
        <Crown className="h-4 w-4 shrink-0 text-amber-500" />
        <p className="text-xs text-amber-700 dark:text-amber-400">
          <span className="font-medium">Super Admin mode.</span> Changes here affect the entire platform and all users.
        </p>
      </div>

      {/* Sub-section tabs */}
      <div className="flex gap-1 rounded-lg border bg-muted/30 p-1">
        {sections.map((s) => {
          const Icon = s.icon;
          const active = section === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm",
                active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{s.label}</span>
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
          {section === "overview" && <AdminOverview />}
          {section === "users" && <AdminUsers />}
          {section === "system" && <AdminSystem />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function AdminOverview() {
  const { data, isLoading } = useQuery<AdminStats>({
    queryKey: ["admin-stats"],
    queryFn: () => api<AdminStats>("/api/admin/stats"),
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
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
    { label: "Active users", value: t?.activeUsers ?? 0, icon: Activity, color: "text-teal-500", bg: "bg-teal-500/10" },
    { label: "Suspended", value: t?.suspendedUsers ?? 0, icon: Ban, color: "text-rose-500", bg: "bg-rose-500/10" },
    { label: "Pro plans", value: t?.proUsers ?? 0, icon: Star, color: "text-violet-500", bg: "bg-violet-500/10" },
    { label: "Agency plans", value: t?.agencyUsers ?? 0, icon: Crown, color: "text-sky-500", bg: "bg-sky-500/10" },
    { label: "Credits used", value: (t?.creditsConsumed ?? 0).toLocaleString(), icon: Zap, color: "text-orange-500", bg: "bg-orange-500/10" },
    { label: "Total chats", value: (t?.chats ?? 0).toLocaleString(), icon: Sparkles, color: "text-fuchsia-500", bg: "bg-fuchsia-500/10" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
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

      {/* Credit usage chart */}
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

function AdminUsers() {
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
      {/* Search + filter */}
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
                {/* User info */}
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

                {/* Badges — hidden on mobile, shown inline */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <Badge variant="outline" className="text-[10px] capitalize">{u.plan}</Badge>
                  <span className={cn("rounded-md px-1.5 py-0.5 text-[10px] font-medium capitalize", statusColor[u.status] ?? "bg-muted text-muted-foreground")}>
                    {u.status}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{u.credits.toLocaleString()} cr</span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 sm:ml-auto">
                  {/* Plan selector */}
                  <Select
                    value={u.plan}
                    onValueChange={(plan) => updateUser.mutate({ id: u.id, body: { plan } })}
                  >
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

                  {/* Grant credits */}
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

                  {/* Suspend / Activate */}
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

function AdminSystem() {
  return (
    <div className="space-y-4">
      <Card className="p-4 sm:p-5">
        <h3 className="mb-1 text-sm font-semibold sm:text-base">Platform settings</h3>
        <p className="mb-4 text-xs text-muted-foreground">Global controls that affect every user on the platform.</p>
        <div className="space-y-4">
          <PrefRow label="Allow new signups" desc="When disabled, new users cannot create accounts" defaultChecked />
          <Separator />
          <PrefRow label="Maintenance mode" desc="Show a maintenance banner and block non-admin access" />
          <Separator />
          <PrefRow label="Require email verification" desc="New users must verify their email before using the platform" defaultChecked />
          <Separator />
          <PrefRow label="Auto-suspend on abuse" desc="Automatically suspend accounts that hit rate limits repeatedly" defaultChecked />
        </div>
      </Card>

      <Card className="p-4 sm:p-5">
        <h3 className="mb-1 text-sm font-semibold sm:text-base">Credit economy</h3>
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
        <h3 className="mb-1 text-sm font-semibold sm:text-base">Audit log</h3>
        <p className="mb-4 text-xs text-muted-foreground">Recent admin actions across the platform.</p>
        <div className="space-y-2 text-xs">
          {[
            { action: "admin.user.update", target: "Sarah Chen", time: "2m ago", detail: "plan → pro" },
            { action: "admin.user.update", target: "Tom Wright", time: "1h ago", detail: "status → banned" },
            { action: "admin.users.view", target: "user list", time: "3h ago", detail: "" },
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

// ---------------------------------------------------------------------------
function DangerTab() {
  return (
    <div className="space-y-4">
      <Card className="border-rose-500/30 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-rose-500/10 text-rose-500">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-rose-600 dark:text-rose-400 sm:text-base">Danger zone</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              These actions are permanent and cannot be undone.
            </p>
          </div>
        </div>
        <Separator className="my-4" />
        <div className="space-y-3">
          <DangerRow
            title="Clear all conversations"
            desc="Delete every chat and message. Documents and images are preserved."
            cta="Clear chats"
          />
          <Separator />
          <DangerRow
            title="Delete account"
            desc="Permanently remove your account, workspace and all associated data."
            cta="Delete account"
            severe
          />
        </div>
      </Card>
    </div>
  );
}

function DangerRow({ title, desc, cta, severe }: { title: string; desc: string; cta: string; severe?: boolean }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <Button
        variant="outline"
        size="sm"
        className={cn("shrink-0", severe && "border-rose-500/40 text-rose-600 hover:bg-rose-500/10 dark:text-rose-400")}
        onClick={() => toast.error("This is a demo — destructive actions are disabled.")}
      >
        {cta}
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function PrefRow({ label, desc, defaultChecked }: { label: string; desc: string; defaultChecked?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <Switch defaultChecked={defaultChecked} />
    </div>
  );
}
