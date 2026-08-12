"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import {
  Search,
  Sparkles,
  TrendingUp,
  FileText,
  ClipboardCheck,
  Code2,
  Tag,
  Copy,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Markdown } from "@/components/markdown";

interface BrandVoice {
  id: string;
  name: string;
  isDefault: boolean;
}

const TOOLS = [
  {
    id: "keywords",
    label: "Keyword Research",
    desc: "Cluster keywords by intent, volume & difficulty.",
    icon: TrendingUp,
    accent: "from-amber-500 to-orange-500",
  },
  {
    id: "meta-tags",
    label: "Meta Tags",
    desc: "Title tags & meta descriptions that drive CTR.",
    icon: Tag,
    accent: "from-rose-500 to-pink-500",
  },
  {
    id: "content-brief",
    label: "Content Brief",
    desc: "Structured brief with H1-H3, FAQs, links.",
    icon: ClipboardCheck,
    accent: "from-emerald-500 to-teal-500",
  },
  {
    id: "page-audit",
    label: "Page Audit",
    desc: "Checklist with severity-rated fixes.",
    icon: Search,
    accent: "from-sky-500 to-cyan-500",
  },
  {
    id: "schema",
    label: "Schema Markup",
    desc: "JSON-LD structured data for rich results.",
    icon: Code2,
    accent: "from-violet-500 to-fuchsia-500",
  },
] as const;

export function SeoView() {
  const qc = useQueryClient();
  const [activeTool, setActiveTool] = useState<string>("keywords");
  const [topic, setTopic] = useState("");
  const [url, setUrl] = useState("");
  const [audience, setAudience] = useState("");
  const [intent, setIntent] = useState("mixed");
  const [brand, setBrand] = useState("NexusAI");
  const [brandVoiceId, setBrandVoiceId] = useState<string>("");
  const [result, setResult] = useState<string>("");

  const { data: voices } = useQuery<BrandVoice[]>({
    queryKey: ["brand-voices"],
    queryFn: () => api<BrandVoice[]>("/api/brand-voices"),
  });

  const generateM = useMutation({
    mutationFn: () =>
      api<{ result: string; credits: number }>("/api/seo/generate", {
        method: "POST",
        body: JSON.stringify({
          tool: activeTool,
          input: { topic, url, audience, intent, brand },
          brandVoiceId: brandVoiceId || undefined,
        }),
      }),
    onSuccess: (data) => {
      setResult(data.result);
      qc.invalidateQueries({ queryKey: ["user"] });
      toast.success(`Generated — ${data.credits} credits left`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const tool = TOOLS.find((t) => t.id === activeTool)!;

  const copyResult = () => {
    navigator.clipboard.writeText(result);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-4 sm:py-6 md:px-6 md:py-8">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative mb-5 overflow-hidden rounded-2xl border bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent p-5 sm:p-6 md:mb-6 md:p-8"
      >
        <div className="absolute inset-0 grid-bg opacity-40" />
        <div className="absolute -top-16 -right-10 h-44 w-44 rounded-full bg-amber-500/20 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-glow">
                <Search className="h-5 w-5" />
              </div>
              <Badge variant="outline" className="gap-1.5">
                <Sparkles className="h-3 w-3" /> AI-powered
              </Badge>
            </div>
            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl md:text-3xl">SEO Workspace</h2>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Research keywords, build content briefs, audit pages and generate schema markup — all in one place.
            </p>
          </div>
        </div>
      </motion.div>

      <div className="grid gap-4 lg:grid-cols-12">
        {/* Tool picker */}
        <div className="lg:col-span-3">
          <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Tools
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            {TOOLS.map((t) => {
              const Icon = t.icon;
              const active = activeTool === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setActiveTool(t.id);
                    setResult("");
                  }}
                  className={cn(
                    "group flex items-start gap-3 rounded-xl border p-3 text-left transition-all hover:shadow-sm",
                    active ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "bg-card hover:border-primary/40"
                  )}
                >
                  <div
                    className={cn(
                      "grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br text-white",
                      t.accent
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{t.label}</p>
                    <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{t.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Generator */}
        <div className="lg:col-span-9">
          <Card className="p-4 sm:p-5 md:p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className={cn("grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br text-white", tool.accent)}>
                <tool.icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold">{tool.label}</h3>
                <p className="text-xs text-muted-foreground">{tool.desc}</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="seo-topic">Primary topic / keyword *</Label>
                <Input
                  id="seo-topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. AI accounting software"
                />
              </div>

              {activeTool === "page-audit" ? (
                <div className="space-y-1.5">
                  <Label htmlFor="seo-url">Page URL to audit</Label>
                  <Input
                    id="seo-url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.com/blog/post"
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label htmlFor="seo-audience">Target audience</Label>
                  <Input
                    id="seo-audience"
                    value={audience}
                    onChange={(e) => setAudience(e.target.value)}
                    placeholder="e.g. small business owners"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="seo-intent">Search intent / type</Label>
                <select
                  id="seo-intent"
                  value={intent}
                  onChange={(e) => setIntent(e.target.value)}
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                >
                  <option value="mixed">Mixed intent</option>
                  <option value="informational">Informational</option>
                  <option value="commercial">Commercial</option>
                  <option value="transactional">Transactional</option>
                  <option value="navigational">Navigational</option>
                  <option value="Article">Article schema</option>
                  <option value="Product">Product schema</option>
                  <option value="FAQ">FAQ schema</option>
                  <option value="Recipe">Recipe schema</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="seo-voice">Brand voice (optional)</Label>
                <select
                  id="seo-voice"
                  value={brandVoiceId}
                  onChange={(e) => setBrandVoiceId(e.target.value)}
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                >
                  <option value="">Default (no voice)</option>
                  {voices?.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} {v.isDefault ? "★" : ""}
                    </option>
                  ))}
                </select>
              </div>

              {activeTool === "meta-tags" && (
                <div className="space-y-1.5">
                  <Label htmlFor="seo-brand">Brand name</Label>
                  <Input
                    id="seo-brand"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="NexusAI"
                  />
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                onClick={() => generateM.mutate()}
                disabled={!topic.trim() || generateM.isPending}
                className="gap-1.5"
              >
                {generateM.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Generate {tool.label}
              </Button>
              {result && (
                <Button variant="outline" onClick={copyResult} className="gap-1.5">
                  <Copy className="h-4 w-4" /> Copy
                </Button>
              )}
            </div>

            {/* Result */}
            {generateM.isPending ? (
              <div className="mt-5 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ) : result ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-5 rounded-xl border bg-muted/30 p-4 sm:p-5"
              >
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Result</p>
                  <Badge variant="outline" className="gap-1 text-[11px]">
                    <FileText className="h-3 w-3" /> Markdown
                  </Badge>
                </div>
                <div className="max-h-[60vh] overflow-y-auto scroll-thin pr-2">
                  <Markdown content={result} />
                </div>
              </motion.div>
            ) : (
              <div className="mt-5 flex flex-col items-center gap-2 rounded-xl border border-dashed p-10 text-center">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-muted text-muted-foreground">
                  <Sparkles className="h-5 w-5" />
                </div>
                <p className="text-sm font-medium">Fill in the inputs and generate</p>
                <p className="max-w-sm text-xs text-muted-foreground">
                  Each generation costs credits. Output is rendered as Markdown — copy to clipboard or paste into your
                  doc.
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
