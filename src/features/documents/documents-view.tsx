"use client";

import { useState } from "react";
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

  const qc = useQueryClient();
  const { data: docs = [] } = useQuery<DocumentDto[]>({
    queryKey: ["documents"],
    queryFn: () => api<DocumentDto[]>("/api/documents"),
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
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold">Recent documents</h3>
          <Button variant="ghost" size="sm" className="text-xs">
            {docs.length} total
          </Button>
        </div>
        {docs.length === 0 ? (
          <Card className="flex flex-col items-center justify-center gap-2 p-10 text-center">
            <FileText className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No documents yet — pick a template to start.</p>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {docs.map((d) => (
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
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeDoc.mutate(d.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <p className="mt-2 truncate text-sm font-medium">{d.title}</p>
                <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline" className="text-[10px] capitalize">{d.kind}</Badge>
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

function DocumentEditor({ doc, onBack, onDelete }: { doc: DocumentDto; onBack: () => void; onDelete: () => void }) {
  const [content, setContent] = useState(doc.content);
  const [title, setTitle] = useState(doc.title);
  const [view, setView] = useState<"preview" | "source">("preview");
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();

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
