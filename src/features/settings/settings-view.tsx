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
  Plus,
  Trash2,
  Check,
  Copy,
  Star,
  Loader2,
  Sparkles,
  AlertTriangle,
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

type TabId = "account" | "brand-voices" | "api-keys" | "danger";

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

  const tabs: { id: TabId; label: string; icon: typeof User; desc: string }[] = [
    { id: "account", label: "Account", icon: User, desc: "Profile, plan & preferences" },
    { id: "brand-voices", label: "Brand Voice", icon: Palette, desc: "Reusable tone profiles" },
    { id: "api-keys", label: "API Keys", icon: Key, desc: "Programmatic access" },
    { id: "danger", label: "Danger Zone", icon: AlertTriangle, desc: "Irreversible actions" },
  ];

  const visibleTabs = tabs;
  const activeMeta = visibleTabs.find((t) => t.id === activeTab);

  return (
    <div className="mx-auto w-full max-w-6xl px-3 py-4 sm:px-4 sm:py-6 md:px-6 md:py-8">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold tracking-tight md:text-2xl">Settings</h2>
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
  const qc = useQueryClient();
  const [name, setName] = useState(user?.name ?? "");
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await api("/api/user", { method: "PATCH", body: JSON.stringify({ name }) });
      qc.invalidateQueries({ queryKey: ["user"] });
      toast.success("Profile saved");
      setHasChanges(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold sm:text-base">Profile</h3>
          <div className="flex items-center gap-2">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">
                {(name || user?.name || "U").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Full name</Label>
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setHasChanges(e.target.value !== (user?.name ?? ""));
              }}
              placeholder="Your name"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Email</Label>
            <Input defaultValue={user?.email} disabled className="bg-muted/50" />
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between">
          {hasChanges ? (
            <p className="text-xs text-amber-600 dark:text-amber-400">Unsaved changes</p>
          ) : (
            <p className="text-xs text-muted-foreground">Changes are saved to your account</p>
          )}
          <div className="flex gap-2">
            {hasChanges && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setName(user?.name ?? "");
                  setHasChanges(false);
                }}
                disabled={saving}
              >
                Cancel
              </Button>
            )}
            <Button
              size="sm"
              onClick={save}
              disabled={saving || !hasChanges || !name.trim()}
            >
              {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Check className="mr-1.5 h-3.5 w-3.5" />}
              {saving ? "Saving" : "Save changes"}
            </Button>
          </div>
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

      <Card className="p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold sm:text-base">Workspace tour</h3>
            <p className="text-sm text-muted-foreground">See the 6-step onboarding guide again</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => {
              try {
                localStorage.removeItem("nexus-onboarding-dismissed");
                toast.success("Tour will appear on next page load");
                setTimeout(() => window.location.reload(), 1200);
              } catch {
                toast.error("Could not reset tour");
              }
            }}
          >
            <Sparkles className="h-3.5 w-3.5" /> Replay tour
          </Button>
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
  const qc = useQueryClient();
  const { openPaywall } = useWorkspace();
  const allowed = plan === "pro" || plan === "agency";
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: keys = [] } = useQuery<{ id: string; name: string; prefix: string; lastUsedAt: string | null; createdAt: string }[]>({
    queryKey: ["api-keys"],
    queryFn: () => api("/api/user/api-keys"),
    enabled: allowed,
  });

  const createKey = useMutation({
    mutationFn: (name: string) =>
      api<{ id: string; key: string }>("/api/user/api-keys", {
        method: "POST",
        body: JSON.stringify({ name }),
      }),
    onSuccess: (data) => {
      setCreatedKey(data.key);
      setShowCreate(false);
      setNewName("");
      qc.invalidateQueries({ queryKey: ["api-keys"] });
      toast.success("API key created — copy it now, you won't see it again");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revokeKey = useMutation({
    mutationFn: (id: string) => api(`/api/user/api-keys/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["api-keys"] });
      toast.success("API key revoked");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const copyKey = () => {
    if (!createdKey) return;
    navigator.clipboard.writeText(createdKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Copied to clipboard");
  };

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
            <p className="text-sm text-muted-foreground">Programmatic access to NexusAI. Keys are shown once — copy immediately.</p>
          </div>
          <Button className="gap-2 shrink-0" size="sm" onClick={() => setShowCreate(true)} disabled={showCreate}>
            <Plus className="h-4 w-4" /> Create key
          </Button>
        </div>

        {/* Create form */}
        {showCreate && (
          <div className="mt-4 space-y-2 rounded-lg border bg-muted/30 p-3">
            <Label htmlFor="api-key-name" className="text-xs text-muted-foreground">Key name</Label>
            <Input
              id="api-key-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Production webhook"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowCreate(false);
                  setNewName("");
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => createKey.mutate(newName)}
                disabled={!newName.trim() || createKey.isPending}
              >
                {createKey.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Plus className="mr-1.5 h-3.5 w-3.5" />}
                Generate
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Newly created key — shown once */}
      {createdKey && (
        <Card className="border-emerald-500/40 bg-emerald-500/5 p-4 sm:p-5">
          <div className="mb-3 flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-500/15 text-emerald-500">
              <Check className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Key created</p>
              <p className="text-xs text-muted-foreground">Copy this key now — you won't see it again.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg border bg-background p-2.5">
            <code className="flex-1 truncate font-mono text-xs text-emerald-600 dark:text-emerald-400">{createdKey}</code>
            <Button size="sm" variant="outline" onClick={copyKey} className="h-7 shrink-0 gap-1.5">
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="mt-3 w-full"
            onClick={() => {
              setCreatedKey(null);
              setCopied(false);
            }}
          >
            I've copied my key
          </Button>
        </Card>
      )}

      {/* Key list */}
      {keys.length === 0 && !createdKey ? (
        <Card className="p-5">
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-muted">
              <Key className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">No API keys yet</p>
            <p className="max-w-xs text-xs text-muted-foreground">Create one to start building integrations.</p>
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="divide-y">
            {keys.map((k) => (
              <div key={k.id} className="group flex items-center gap-3 p-3 transition-colors hover:bg-muted/30">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Key className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{k.name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <code className="font-mono">{k.prefix}</code>
                    <span>·</span>
                    <span>Created {new Date(k.createdAt).toLocaleDateString()}</span>
                    {k.lastUsedAt && (
                      <>
                        <span>·</span>
                        <span>Last used {new Date(k.lastUsedAt).toLocaleDateString()}</span>
                      </>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => revokeKey.mutate(k.id)}
                  aria-label="Revoke key"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}
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
