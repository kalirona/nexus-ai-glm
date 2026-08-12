"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import {
  Megaphone,
  Sparkles,
  Facebook,
  Search,
  Mail,
  GitBranch,
  Package,
  Layout,
  Copy,
  Loader2,
  FileText,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
    id: "fb-ad",
    label: "Facebook Ads",
    desc: "3 variations with primary text + headline + CTA.",
    icon: Facebook,
    accent: "from-blue-500 to-indigo-500",
  },
  {
    id: "google-ad",
    label: "Google Ads (RSA)",
    desc: "15 headlines, 4 descriptions, sitelinks.",
    icon: Search,
    accent: "from-emerald-500 to-teal-500",
  },
  {
    id: "email-sequence",
    label: "Email Sequence",
    desc: "5-email conversion sequence with CTAs.",
    icon: Mail,
    accent: "from-rose-500 to-pink-500",
  },
  {
    id: "funnel",
    label: "Funnel Builder",
    desc: "5-stage funnel with KPIs & assets per stage.",
    icon: GitBranch,
    accent: "from-amber-500 to-orange-500",
  },
  {
    id: "product-desc",
    label: "Product Description",
    desc: "Short, medium & long variations.",
    icon: Package,
    accent: "from-violet-500 to-fuchsia-500",
  },
  {
    id: "landing-copy",
    label: "Landing Page",
    desc: "Long-form sales page with PAS framework.",
    icon: Layout,
    accent: "from-cyan-500 to-sky-500",
  },
] as const;

export function MarketingView() {
  const qc = useQueryClient();
  const [activeTool, setActiveTool] = useState<string>("fb-ad");
  const [product, setProduct] = useState("");
  const [audience, setAudience] = useState("");
  const [benefit, setBenefit] = useState("");
  const [offer, setOffer] = useState("");
  const [topic, setTopic] = useState("");
  const [brandVoiceId, setBrandVoiceId] = useState<string>("");
  const [result, setResult] = useState<string>("");

  const { data: voices } = useQuery<BrandVoice[]>({
    queryKey: ["brand-voices"],
    queryFn: () => api<BrandVoice[]>("/api/brand-voices"),
  });

  const generateM = useMutation({
    mutationFn: () =>
      api<{ result: string; credits: number }>("/api/marketing/generate", {
        method: "POST",
        body: JSON.stringify({
          tool: activeTool,
          input: { product, audience, benefit, offer, topic },
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
        className="relative mb-5 overflow-hidden rounded-2xl border bg-gradient-to-br from-rose-500/10 via-pink-500/5 to-transparent p-5 sm:p-6 md:mb-6 md:p-8"
      >
        <div className="absolute inset-0 grid-bg opacity-40" />
        <div className="absolute -top-16 -right-10 h-44 w-44 rounded-full bg-rose-500/20 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 text-white shadow-glow">
                <Megaphone className="h-5 w-5" />
              </div>
              <Badge variant="outline" className="gap-1.5">
                <Sparkles className="h-3 w-3" /> Conversion-focused
              </Badge>
            </div>
            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl md:text-3xl">Marketing Workspace</h2>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Plan campaigns, write ad copy, build funnels and craft email sequences that convert.
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
                  <div className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br text-white", t.accent)}>
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
                <Label htmlFor="mkt-product">Product / service *</Label>
                <Input
                  id="mkt-product"
                  value={product}
                  onChange={(e) => setProduct(e.target.value)}
                  placeholder="e.g. NexusAI Business OS"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mkt-audience">Target audience</Label>
                <Input
                  id="mkt-audience"
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  placeholder="e.g. solo founders & agencies"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mkt-benefit">Key benefit</Label>
                <Input
                  id="mkt-benefit"
                  value={benefit}
                  onChange={(e) => setBenefit(e.target.value)}
                  placeholder="e.g. replace 10 SaaS tools"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mkt-offer">Offer / price</Label>
                <Input
                  id="mkt-offer"
                  value={offer}
                  onChange={(e) => setOffer(e.target.value)}
                  placeholder="e.g. $29/mo Pro plan"
                />
              </div>

              {activeTool === "google-ad" && (
                <div className="space-y-1.5">
                  <Label htmlFor="mkt-topic">Target keyword</Label>
                  <Input
                    id="mkt-topic"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. AI business tools"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="mkt-voice">Brand voice</Label>
                <select
                  id="mkt-voice"
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
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                onClick={() => generateM.mutate()}
                disabled={!product.trim() || generateM.isPending}
                className="gap-1.5"
              >
                {generateM.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Generate
              </Button>
              {result && (
                <Button variant="outline" onClick={copyResult} className="gap-1.5">
                  <Copy className="h-4 w-4" /> Copy
                </Button>
              )}
            </div>

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
                  Apply your brand voice to keep copy on-message. Each generation costs credits.
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
