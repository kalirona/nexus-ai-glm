"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import {
  Palette,
  Plus,
  Star,
  Trash2,
  Pencil,
  Sparkles,
  Volume2,
  Check,
  X,
  ShieldCheck,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

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

const TONE_PRESETS = [
  "professional, confident",
  "friendly, conversational",
  "bold, punchy",
  "playful, witty",
  "calm, empathetic",
  "expert, authoritative",
  "casual, modern",
  "luxurious, refined",
];

const EMPTY_FORM = {
  name: "",
  description: "",
  tone: "professional, confident",
  vocabulary: "",
  avoidWords: "",
  sampleCopy: "",
  isDefault: false,
};

export function BrandVoiceView() {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);

  const { data: voices, isLoading } = useQuery<BrandVoice[]>({
    queryKey: ["brand-voices"],
    queryFn: () => api<BrandVoice[]>("/api/brand-voices"),
  });

  const createM = useMutation({
    mutationFn: (v: typeof EMPTY_FORM) => api<BrandVoice>("/api/brand-voices", { method: "POST", body: JSON.stringify(v) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["brand-voices"] });
      toast.success("Brand voice created");
      setForm(EMPTY_FORM);
      setShowForm(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateM = useMutation({
    mutationFn: ({ id, v }: { id: string; v: typeof EMPTY_FORM }) =>
      api<BrandVoice>(`/api/brand-voices/${id}`, { method: "PATCH", body: JSON.stringify(v) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["brand-voices"] });
      toast.success("Brand voice updated");
      setForm(EMPTY_FORM);
      setEditingId(null);
      setShowForm(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteM = useMutation({
    mutationFn: (id: string) => api(`/api/brand-voices/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["brand-voices"] });
      toast.success("Brand voice deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setDefaultM = useMutation({
    mutationFn: (id: string) =>
      api<BrandVoice>(`/api/brand-voices/${id}`, { method: "PATCH", body: JSON.stringify({ isDefault: true }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["brand-voices"] });
      toast.success("Default brand voice set");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const startEdit = (v: BrandVoice) => {
    setEditingId(v.id);
    setForm({
      name: v.name,
      description: v.description ?? "",
      tone: v.tone,
      vocabulary: v.vocabulary ?? "",
      avoidWords: v.avoidWords ?? "",
      sampleCopy: v.sampleCopy ?? "",
      isDefault: v.isDefault,
    });
    setShowForm(true);
  };

  const cancel = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(false);
  };

  const submit = () => {
    if (!form.name.trim()) {
      toast.error("Give your brand voice a name");
      return;
    }
    if (editingId) {
      updateM.mutate({ id: editingId, v: form });
    } else {
      createM.mutate(form);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-3 py-4 sm:px-4 sm:py-6 md:px-6 md:py-8">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative mb-5 overflow-hidden rounded-2xl border bg-gradient-to-br from-fuchsia-500/10 via-rose-500/5 to-transparent p-5 sm:p-6 md:mb-6 md:p-8"
      >
        <div className="absolute inset-0 grid-bg opacity-40" />
        <div className="absolute -top-16 -right-10 h-44 w-44 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-rose-500 text-white shadow-glow">
                <Palette className="h-5 w-5" />
              </div>
              <Badge variant="outline" className="gap-1.5">
                <Sparkles className="h-3 w-3" /> Brand consistency
              </Badge>
            </div>
            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl md:text-3xl">Brand Voice</h2>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Define the tone, vocabulary, and style your AI uses across documents, ads and emails. One default
              applies everywhere — create multiple profiles for different brands or sub-brands.
            </p>
          </div>
          {!showForm && (
            <Button onClick={() => setShowForm(true)} className="shrink-0 gap-1.5">
              <Plus className="h-4 w-4" /> New voice
            </Button>
          )}
        </div>
      </motion.div>

      {/* Form (collapsible) */}
      {showForm && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mb-5">
          <Card className="overflow-hidden p-5 sm:p-6 md:mb-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold">
                  {editingId ? "Edit brand voice" : "Create brand voice"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  The system prompt fragment is auto-generated from these fields.
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={cancel} aria-label="Close form">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="bv-name">Profile name *</Label>
                <Input
                  id="bv-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. NexusAI primary"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bv-desc">Short description</Label>
                <Input
                  id="bv-desc"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="e.g. Bold, modern B2B SaaS voice"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="bv-tone">Tone</Label>
                <Input
                  id="bv-tone"
                  value={form.tone}
                  onChange={(e) => setForm({ ...form, tone: e.target.value })}
                  placeholder="professional, confident"
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {TONE_PRESETS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm({ ...form, tone: t })}
                      className={cn(
                        "rounded-full border px-2.5 py-0.5 text-[11px] transition-colors hover:bg-muted",
                        form.tone === t && "border-primary bg-primary/10 text-primary"
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bv-vocab">Preferred vocabulary</Label>
                <Textarea
                  id="bv-vocab"
                  value={form.vocabulary}
                  onChange={(e) => setForm({ ...form, vocabulary: e.target.value })}
                  placeholder="workspace, ship, automation, founders"
                  rows={3}
                />
                <p className="text-[11px] text-muted-foreground">Comma-separated words to favour.</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bv-avoid">Words to avoid</Label>
                <Textarea
                  id="bv-avoid"
                  value={form.avoidWords}
                  onChange={(e) => setForm({ ...form, avoidWords: e.target.value })}
                  placeholder="cheap, free, guaranteed"
                  rows={3}
                />
                <p className="text-[11px] text-muted-foreground">Comma-separated words to never use.</p>
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="bv-sample">Reference sample</Label>
                <Textarea
                  id="bv-sample"
                  value={form.sampleCopy}
                  onChange={(e) => setForm({ ...form, sampleCopy: e.target.value })}
                  placeholder="Paste a paragraph that exemplifies your desired voice. The AI will mimic this style."
                  rows={5}
                />
                <p className="text-[11px] text-muted-foreground">
                  The AI will use this as a style anchor when generating content.
                </p>
              </div>

              <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3 md:col-span-2">
                <div>
                  <Label htmlFor="bv-default" className="cursor-pointer">
                    Set as default
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    The default voice is automatically applied to all new generations.
                  </p>
                </div>
                <Switch
                  id="bv-default"
                  checked={form.isDefault}
                  onCheckedChange={(v) => setForm({ ...form, isDefault: v })}
                />
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Button onClick={submit} disabled={createM.isPending || updateM.isPending}>
                {editingId ? "Save changes" : "Create voice"}
              </Button>
              <Button variant="outline" onClick={cancel}>
                Cancel
              </Button>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Voices list */}
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-56 w-full rounded-xl" />
          ))}
        </div>
      ) : voices && voices.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-3 p-10 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-fuchsia-500/10 text-fuchsia-500">
            <Palette className="h-7 w-7" />
          </div>
          <div>
            <p className="text-base font-medium">No brand voices yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create your first profile to keep every chat, doc, and ad on-brand.
            </p>
          </div>
          {!showForm && (
            <Button onClick={() => setShowForm(true)} className="mt-1 gap-1.5">
              <Plus className="h-4 w-4" /> Create brand voice
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {voices?.map((v, i) => (
            <motion.div
              key={v.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Card
                className={cn(
                  "relative flex h-full flex-col p-4 transition-all hover:shadow-md sm:p-5",
                  v.isDefault && "border-fuchsia-500/40 ring-1 ring-fuchsia-500/30"
                )}
              >
                {v.isDefault && (
                  <div className="absolute -top-2 left-4">
                    <Badge className="gap-1 bg-fuchsia-500 text-white">
                      <Star className="h-3 w-3 fill-current" /> Default
                    </Badge>
                  </div>
                )}
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-fuchsia-500/15 to-rose-500/10 text-fuchsia-500">
                    <Volume2 className="h-5 w-5" />
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => startEdit(v)}
                      aria-label="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteM.mutate(v.id)}
                      aria-label="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <p className="truncate text-sm font-semibold">{v.name}</p>
                {v.description && (
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{v.description}</p>
                )}

                <div className="mt-3 space-y-1.5 text-xs">
                  <div className="flex items-start gap-2">
                    <span className="shrink-0 text-muted-foreground">Tone</span>
                    <span className="font-medium">{v.tone}</span>
                  </div>
                  {v.vocabulary && (
                    <div className="flex items-start gap-2">
                      <span className="shrink-0 text-muted-foreground">Vocab</span>
                      <span className="line-clamp-1">{v.vocabulary}</span>
                    </div>
                  )}
                  {v.avoidWords && (
                    <div className="flex items-start gap-2">
                      <span className="shrink-0 text-muted-foreground">Avoid</span>
                      <span className="line-clamp-1 text-destructive">{v.avoidWords}</span>
                    </div>
                  )}
                </div>

                <div className="mt-auto flex items-center justify-between pt-4">
                  <span className="text-[11px] text-muted-foreground">
                    Updated {new Date(v.updatedAt).toLocaleDateString()}
                  </span>
                  {!v.isDefault && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1.5 text-xs"
                      onClick={() => setDefaultM.mutate(v.id)}
                    >
                      <ShieldCheck className="h-3.5 w-3.5" /> Set default
                    </Button>
                  )}
                  {v.isDefault && (
                    <Badge variant="outline" className="gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
                      <Check className="h-3 w-3" /> Active
                    </Badge>
                  )}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
