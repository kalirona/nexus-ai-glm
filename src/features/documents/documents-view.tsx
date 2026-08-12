"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type DocumentDto } from "@/lib/api-client";
import { TEMPLATES } from "@/lib/constants";
import {
  Target,
  Megaphone,
  Mail,
  FileText,
  Scale,
  BarChart3,
  Sparkles,
  ArrowLeft,
  Download,
  Copy,
  Check,
  Trash2,
  Loader2,
  Wand2,
  Plus,
  Clock,
  Palette,
  Search,
  X,
  Copy as CopyDoc,
  Filter,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Markdown } from "@/components/markdown";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { motion } from "framer-motion";

const ICONS: Record<string, typeof Target> = {
  Target,
  Megaphone,
  Mail,
  FileText,
  Scale,
  BarChart3,
};

export function DocumentsView() {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [activeDoc, setActiveDoc] = useState<DocumentDto | null>(null);
  const [mode, setMode] = useState<"gallery" | "generate" | "editor">("gallery");
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<string>("all");

  const qc = useQueryClient();
  const { data: docs = [] } = useQuery<DocumentDto[]>({
    queryKey: ["documents"],
    queryFn: () => api<DocumentDto[]>("/api/documents"),
  });

  // Build kind filter chips from existing docs
  const kindCounts: Record<string, number> = {};
  for (const d of docs) {
    kindCounts[d.kind] = (kindCounts[d.kind] ?? 0) + 1;
  }
  const kindChips = Object.entries(kindCounts).sort((a, b) => b[1] - a[1]);

  // Filter docs by search + kind
  const filteredDocs = docs.filter((d) => {
    const matchSearch =
      !search.trim() ||
      d.title.toLowerCase().includes(search.toLowerCase()) ||
      (d.tags ?? "").toLowerCase().includes(search.toLowerCase());
    const matchKind = kindFilter === "all" || d.kind === kindFilter;
    return matchSearch && matchKind;
  });

  const generate = useMutation({
    mutationFn: async (vars: { templateKey: string; fields: Record<string, string>; brandVoiceId?: string }) =>
      api<{ document: DocumentDto; credits: number }>("/api/documents/generate", {
        method: "POST",
        body: JSON.stringify(vars),
      }),
    onSuccess: (data) => {
      setActiveDoc(data.document);
      setMode("editor");
      qc.invalidateQueries({ queryKey: ["documents"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["user"] });
      toast.success("Document generated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeDoc = useMutation({
    mutationFn: (id: string) => api(`/api/documents/${id}`, { method: "DELETE" }),
    onSuccess: (_, id) => {
      if (activeDoc?.id === id) {
        setActiveDoc(null);
        setMode("gallery");
      }
      qc.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Document deleted");
    },
  });

  const duplicateDoc = useMutation({
    mutationFn: (doc: DocumentDto) =>
      api<DocumentDto>("/api/documents", {
        method: "POST",
        body: JSON.stringify({
          title: `${doc.title} (copy)`,
          content: doc.content,
          kind: doc.kind,
          tags: doc.tags ?? undefined,
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Document duplicated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ---------- Editor ----------
  if (mode === "editor" && activeDoc) {
    return (
      <DocumentEditor
        doc={activeDoc}
        onBack={() => {
          setActiveDoc(null);
          setMode("gallery");
        }}
        onDelete={() => removeDoc.mutate(activeDoc.id)}
        onDuplicate={() => duplicateDoc.mutate(activeDoc)}
      />
    );
  }

  // ---------- Generate form ----------
  if (mode === "generate" && selectedTemplate) {
    const tpl = TEMPLATES.find((t) => t.key === selectedTemplate)!;
    return (
      <GenerateForm
        template={tpl}
        onBack={() => setMode("gallery")}
        onSubmit={(fields, brandVoiceId) => generate.mutate({ templateKey: tpl.key, fields, brandVoiceId })}
        loading={generate.isPending}
      />
    );
  }

  // ---------- Gallery ----------
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
      <div className="mb-6">
        <h2 className="text-xl font-semibold tracking-tight md:text-2xl">Document templates</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Generate investor-ready documents in seconds — business plans, contracts, emails, sales copy & more.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TEMPLATES.map((tpl, i) => {
          const Icon = ICONS[tpl.icon] ?? FileText;
          return (
            <motion.button
              key={tpl.key}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => {
                setSelectedTemplate(tpl.key);
                setMode("generate");
              }}
              className="text-left"
            >
              <Card className="group relative h-full overflow-hidden p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
                <div className="mb-3 flex items-center justify-between">
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <Badge variant="outline" className="text-[10px]">{tpl.category}</Badge>
                </div>
                <p className="font-medium">{tpl.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{tpl.description}</p>
                <div className="mt-3 flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                  <Wand2 className="h-3 w-3" /> Generate
                </div>
              </Card>
            </motion.button>
          );
        })}
      </div>

      {/* Recent documents */}
      <div className="mt-8">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-semibold">Recent documents</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {filteredDocs.length}
              {filteredDocs.length !== docs.length && ` of ${docs.length}`}
            </span>
          </div>
        </div>

        {/* Search + kind filters */}
        {docs.length > 0 && (
          <div className="mb-4 space-y-2.5">
            <div className="relative max-w-sm">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by title or tag…"
                className="h-9 pl-8 pr-8 text-sm"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            {kindChips.length > 1 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <Filter className="h-3 w-3 text-muted-foreground" />
                <button
                  onClick={() => setKindFilter("all")}
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors",
                    kindFilter === "all"
                      ? "border-primary bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  All ({docs.length})
                </button>
                {kindChips.map(([kind, count]) => (
                  <button
                    key={kind}
                    onClick={() => setKindFilter(kind)}
                    className={cn(
                      "rounded-full border px-2.5 py-0.5 text-[11px] font-medium capitalize transition-colors",
                      kindFilter === kind
                        ? "border-primary bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted",
                      kind === "seo" && kindFilter === kind && "border-amber-500 bg-amber-500/10 text-amber-600",
                      kind === "marketing" && kindFilter === kind && "border-rose-500 bg-rose-500/10 text-rose-600",
                      kind === "youtube" && kindFilter === kind && "border-red-500 bg-red-500/10 text-red-600"
                    )}
                  >
                    {kind} ({count})
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {docs.length === 0 ? (
          <Card className="flex flex-col items-center justify-center gap-2 p-10 text-center">
            <FileText className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No documents yet — pick a template to start.</p>
          </Card>
        ) : filteredDocs.length === 0 ? (
          <Card className="flex flex-col items-center justify-center gap-2 p-10 text-center">
            <Search className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              No documents match "{search}"
              {kindFilter !== "all" && ` in ${kindFilter}`}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch("");
                setKindFilter("all");
              }}
            >
              Clear filters
            </Button>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredDocs.map((d) => (
              <Card
                key={d.id}
                className="group cursor-pointer p-4 transition-all hover:-translate-y-0.5 hover:shadow-md"
                onClick={() => {
                  setActiveDoc(d);
                  setMode("editor");
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="flex shrink-0 gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground opacity-0 transition-opacity hover:text-primary group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        duplicateDoc.mutate(d);
                      }}
                      aria-label="Duplicate"
                      disabled={duplicateDoc.isPending}
                    >
                      <CopyDoc className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeDoc.mutate(d.id);
                      }}
                      aria-label="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <p className="mt-2 truncate text-sm font-medium">{d.title}</p>
                <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] capitalize",
                      d.kind === "seo" && "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
                      d.kind === "marketing" && "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400",
                      d.kind === "youtube" && "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400",
                      d.kind === "business-plan" && "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                      d.kind === "sales-copy" && "border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-400",
                      d.kind === "email" && "border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400",
                      d.kind === "blog" && "border-teal-500/30 bg-teal-500/10 text-teal-600 dark:text-teal-400",
                    )}
                  >
                    {d.kind}
                  </Badge>
                  {d.tags && (
                    <span className="truncate text-[10px] text-muted-foreground/70">· {d.tags}</span>
                  )}
                  <Clock className="h-3 w-3" />
                  {new Date(d.updatedAt).toLocaleDateString()}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function GenerateForm({
  template,
  onBack,
  onSubmit,
  loading,
}: {
  template: (typeof TEMPLATES)[number];
  onBack: () => void;
  onSubmit: (fields: Record<string, string>, brandVoiceId?: string) => void;
  loading: boolean;
}) {
  const [fields, setFields] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const f of template.fields) init[f.key] = f.default ?? "";
    return init;
  });
  const [brandVoiceId, setBrandVoiceId] = useState<string>("");
  const Icon = ICONS[template.icon] ?? FileText;

  const { data: voices = [] } = useQuery<{ id: string; name: string; isDefault: boolean }[]>({
    queryKey: ["brand-voices"],
    queryFn: () => api("/api/brand-voices"),
  });

  // Resolve the effective voice: explicit selection, or the default voice, or none.
  const effectiveVoiceId = brandVoiceId || (voices.find((v) => v.isDefault)?.id ?? "");

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:py-8">
      <Button variant="ghost" size="sm" onClick={onBack} className="mb-4 -ml-2">
        <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to templates
      </Button>

      <Card className="p-6 md:p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">{template.name}</h2>
            <p className="text-sm text-muted-foreground">{template.description}</p>
          </div>
        </div>

        <div className="space-y-4">
          {template.fields.map((f) => (
            <div key={f.key} className="space-y-1.5">
              <Label htmlFor={f.key} className="text-sm font-medium">
                {f.label}
              </Label>
              {f.type === "textarea" ? (
                <Textarea
                  id={f.key}
                  value={fields[f.key]}
                  onChange={(e) => setFields((s) => ({ ...s, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  rows={3}
                />
              ) : (
                <Input
                  id={f.key}
                  value={fields[f.key]}
                  onChange={(e) => setFields((s) => ({ ...s, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                />
              )}
            </div>
          ))}

          {/* Brand voice selector */}
          {voices.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="brand-voice" className="flex items-center gap-1.5 text-sm font-medium">
                <Palette className="h-3.5 w-3.5" />
                Brand voice
              </Label>
              <Select value={brandVoiceId} onValueChange={(v) => setBrandVoiceId(v === effectiveVoiceId && !brandVoiceId ? "" : v)}>
                <SelectTrigger id="brand-voice" className="w-full">
                  <SelectValue placeholder="No voice (default tone)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No voice (default tone)</SelectItem>
                  {voices.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name}{v.isDefault ? " · default" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {brandVoiceId === "" && effectiveVoiceId && (
                <p className="text-[11px] text-muted-foreground">Using your default voice automatically.</p>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">5 credits · ~10 seconds</p>
          <Button onClick={() => onSubmit(fields, effectiveVoiceId || undefined)} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? "Generating…" : "Generate document"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

function DocumentEditor({ doc, onBack, onDelete, onDuplicate }: { doc: DocumentDto; onBack: () => void; onDelete: () => void; onDuplicate?: () => void }) {
  const [content, setContent] = useState(doc.content);
  const [title, setTitle] = useState(doc.title);
  const [view, setView] = useState<"preview" | "source">("preview");
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const qc = useQueryClient();

  // Update word count when content changes
  useEffect(() => {
    setWordCount(content.trim() ? content.trim().split(/\s+/).length : 0);
  }, [content]);

  const save = async () => {
    setSaving(true);
    try {
      await api(`/api/documents/${doc.id}`, {
        method: "PATCH",
        body: JSON.stringify({ title, content }),
      });
      qc.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const exportMd = () => {
    const blob = new Blob([`# ${title}\n\n${content}`], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported as Markdown");
  };

  const copyAll = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="mx-auto flex h-full max-w-5xl flex-col px-4 py-4 md:px-6">
      <div className="mb-3 flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2">
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
        </Button>
        <div className="flex-1" />
        {onDuplicate && (
          <Button variant="ghost" size="sm" onClick={onDuplicate}>
            <CopyDoc className="mr-1.5 h-3.5 w-3.5" /> Duplicate
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={onDelete} className="text-destructive">
          <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
        </Button>
      </div>

      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* Editor toolbar */}
        <div className="flex flex-wrap items-center gap-2 border-b p-3">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-9 flex-1 border-0 bg-transparent px-1 text-base font-semibold focus-visible:ring-0"
          />
          <span className="hidden shrink-0 text-[11px] text-muted-foreground sm:inline">
            {wordCount.toLocaleString()} words
          </span>
          <div className="flex rounded-lg border p-0.5">
            <button
              onClick={() => setView("preview")}
              className={cn("rounded-md px-3 py-1 text-xs font-medium transition-colors", view === "preview" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
            >
              Preview
            </button>
            <button
              onClick={() => setView("source")}
              className={cn("rounded-md px-3 py-1 text-xs font-medium transition-colors", view === "source" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
            >
              Markdown
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={copyAll}>
            {copied ? <Check className="mr-1.5 h-3.5 w-3.5" /> : <Copy className="mr-1.5 h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button variant="outline" size="sm" onClick={exportMd}>
            <Download className="mr-1.5 h-3.5 w-3.5" /> Export
          </Button>
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Plus className="mr-1.5 h-3.5 w-3.5" />}
            {saving ? "Saving" : "Save"}
          </Button>
        </div>

        {/* Body */}
        <ScrollArea className="min-h-0 flex-1">
          <div className="p-5 md:p-8">
            {view === "source" ? (
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[60vh] resize-none border-0 bg-transparent font-mono text-sm focus-visible:ring-0"
              />
            ) : (
              <Markdown content={content} className="max-w-none" />
            )}
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
}
