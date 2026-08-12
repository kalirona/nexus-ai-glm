"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import {
  Search,
  Sparkles,
  TrendingUp,
  ClipboardCheck,
  Code2,
  Tag,
  Loader2,
  Copy,
  Package,
  Zap,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { GeneratorResultPanel } from "@/components/generator-result-panel";
import { useGeneratorHistory } from "@/hooks/use-generator-history";

interface BrandVoice {
  id: string;
  name: string;
  isDefault: boolean;
}

const TOOLS = [
  {
    id: "package",
    label: "SEO Package",
    desc: "Keywords + Content Brief + Meta Tags in one job.",
    icon: Package,
    accent: "from-fuchsia-500 via-rose-500 to-amber-500",
    hint: "3-in-1 bulk job · saves as a single Document",
    isPackage: true,
  },
  {
    id: "keywords",
    label: "Keyword Research",
    desc: "Cluster keywords by intent, volume & difficulty.",
    icon: TrendingUp,
    accent: "from-amber-500 to-orange-500",
    hint: "15-25 keywords across 3-5 clusters",
  },
  {
    id: "meta-tags",
    label: "Meta Tags",
    desc: "Title tags & meta descriptions that drive CTR.",
    icon: Tag,
    accent: "from-rose-500 to-pink-500",
    hint: "3 variations (50-60 char titles, 140-160 descriptions)",
  },
  {
    id: "content-brief",
    label: "Content Brief",
    desc: "Structured brief with H1-H3, FAQs, links.",
    icon: ClipboardCheck,
    accent: "from-emerald-500 to-teal-500",
    hint: "H1-H3 structure + 5 FAQs + semantic keywords",
  },
  {
    id: "page-audit",
    label: "Page Audit",
    desc: "Checklist with severity-rated fixes.",
    icon: Search,
    accent: "from-sky-500 to-cyan-500",
    hint: "Severity-rated checklist + top 5 prioritised fixes",
  },
  {
    id: "schema",
    label: "Schema Markup",
    desc: "JSON-LD structured data for rich results.",
    icon: Code2,
    accent: "from-violet-500 to-fuchsia-500",
    hint: "Valid JSON-LD + rich-result explanation",
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
  const history = useGeneratorHistory("seo");

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
      qc.invalidateQueries({ queryKey: ["generator-history", "seo"] });
      toast.success(`Generated — ${data.credits} credits left`);
      // Persist to DB-backed history (syncs across devices)
      history.add({
        tool: activeTool,
        toolLabel: tool.label,
        input: topic || url || "(untitled)",
        result: data.result,
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // SEO Package — runs 3 tools in sequence + auto-saves as a Document
  const packageM = useMutation({
    mutationFn: () =>
      api<{
        results: { keywords: string; brief: string; meta: string };
        documentId: string;
        credits: number;
      }>("/api/seo/package", {
        method: "POST",
        body: JSON.stringify({
          topic,
          audience,
          brandVoiceId: brandVoiceId || undefined,
        }),
      }),
    onSuccess: (data) => {
      // Combine all 3 results into a single markdown view
      const combined = [
        `# SEO Package — ${topic}`,
        "",
        `**Saved to Documents** · ${data.credits} credits left`,
        "",
        "---",
        "",
        "## 1. Keyword Research",
        "",
        data.results.keywords,
        "",
        "---",
        "",
        "## 2. Content Brief",
        "",
        data.results.brief,
        "",
        "---",
        "",
        "## 3. Meta Tags",
        "",
        data.results.meta,
      ].join("\n");
      setResult(combined);
      qc.invalidateQueries({ queryKey: ["user"] });
      qc.invalidateQueries({ queryKey: ["documents"] });
      qc.invalidateQueries({ queryKey: ["generator-history", "seo"] });
      toast.success(`SEO Package complete — saved to Documents · ${data.credits} credits left`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const isPackage = activeTool === "package";
  const isGenerating = generateM.isPending || packageM.isPending;

  const handleGenerate = () => {
    if (isPackage) {
      packageM.mutate();
    } else {
      generateM.mutate();
    }
  };

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
            {TOOLS.map((t, idx) => {
              const Icon = t.icon;
              const active = activeTool === t.id;
              const isPkg = "isPackage" in t && t.isPackage;
              return (
                <motion.button
                  key={t.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  onClick={() => {
                    setActiveTool(t.id);
                    setResult("");
                  }}
                  className={cn(
                    "group relative flex items-start gap-3 overflow-hidden rounded-xl border p-3 text-left transition-all hover:shadow-sm",
                    active
                      ? isPkg
                        ? "border-fuchsia-500 bg-fuchsia-500/5 ring-1 ring-fuchsia-500/30"
                        : "border-primary bg-primary/5 ring-1 ring-primary/20"
                      : "bg-card hover:border-primary/40",
                    isPkg && !active && "border-fuchsia-500/30"
                  )}
                >
                  {active && (
                    <span
                      className={cn(
                        "absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full",
                        isPkg ? "bg-fuchsia-500" : "bg-primary"
                      )}
                    />
                  )}
                  {isPkg && (
                    <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-fuchsia-500" />
                  )}
                  <div
                    className={cn(
                      "grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br text-white shadow-sm transition-transform group-hover:scale-105",
                      t.accent
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <p className="truncate text-sm font-medium">{t.label}</p>
                      {isPkg ? (
                        <Badge className="bg-gradient-to-r from-fuchsia-500 to-rose-500 px-1.5 py-0 text-[9px] font-bold uppercase text-white">
                          <Zap className="mr-0.5 h-2.5 w-2.5" /> 3x
                        </Badge>
                      ) : (
                        <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                          #{idx}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{t.desc}</p>
                    <p
                      className={cn(
                        "mt-1 truncate text-[10px] font-medium",
                        isPkg ? "text-fuchsia-600/80 dark:text-fuchsia-400/80" : "text-primary/70"
                      )}
                    >
                      {t.hint}
                    </p>
                  </div>
                </motion.button>
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
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold">{tool.label}</h3>
                  {isPackage && (
                    <Badge className="gap-1 bg-gradient-to-r from-fuchsia-500 to-rose-500 text-white">
                      <Zap className="h-3 w-3" /> 3-in-1
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{tool.desc}</p>
              </div>
            </div>

            {isPackage && (
              <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-fuchsia-500/30 bg-fuchsia-500/5 px-3.5 py-2.5">
                <Package className="mt-0.5 h-4 w-4 shrink-0 text-fuchsia-500" />
                <p className="text-xs text-fuchsia-700 dark:text-fuchsia-400">
                  <span className="font-medium">SEO Package runs 3 tools in sequence</span> —
                  Keyword Research → Content Brief → Meta Tags. Costs 3x credits. The combined
                  result is auto-saved to Documents so you have a complete SEO brief in one place.
                </p>
              </div>
            )}

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

              {!isPackage && (
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
              )}

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
                onClick={handleGenerate}
                disabled={!topic.trim() || isGenerating}
                className={cn("gap-1.5", isPackage && "bg-gradient-to-r from-fuchsia-500 to-rose-500 hover:from-fuchsia-600 hover:to-rose-600")}
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isPackage ? (
                  <Package className="h-4 w-4" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {isPackage ? "Run SEO Package" : `Generate ${tool.label}`}
              </Button>
              {result && !isPackage && (
                <Button variant="outline" onClick={copyResult} className="gap-1.5">
                  <Copy className="h-4 w-4" /> Copy
                </Button>
              )}
              {result && isPackage && (
                <Button variant="outline" onClick={copyResult} className="gap-1.5">
                  <Copy className="h-4 w-4" /> Copy package
                </Button>
              )}
            </div>

            <GeneratorResultPanel
              module="seo"
              isLoading={isGenerating}
              result={result}
              toolLabel={tool.label}
              inputLabel={topic || url || "(untitled)"}
              onClear={() => setResult("")}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
