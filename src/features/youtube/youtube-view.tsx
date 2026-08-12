"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import {
  Youtube,
  Sparkles,
  Type,
  FileText,
  Search,
  Image as ImageIcon,
  Clapperboard,
  Copy,
  Loader2,
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
    id: "titles",
    label: "Title Generator",
    desc: "10 high-CTR titles with CTR rationale.",
    icon: Type,
    accent: "from-red-500 to-rose-500",
    hint: "10 titles ≤70 chars · proven CTR patterns",
  },
  {
    id: "script",
    label: "Video Script",
    desc: "Retention-optimised script with hooks.",
    icon: FileText,
    accent: "from-orange-500 to-amber-500",
    hint: "Timestamped script · hooks every 30s",
  },
  {
    id: "description",
    label: "SEO Description",
    desc: "Keyword-rich description with timestamps.",
    icon: Search,
    accent: "from-violet-500 to-fuchsia-500",
    hint: "First 150 chars SEO hook · 5 hashtags",
  },
  {
    id: "thumbnail-ideas",
    label: "Thumbnail Concepts",
    desc: "5 visual concepts with text + palette.",
    icon: ImageIcon,
    accent: "from-sky-500 to-cyan-500",
    hint: "5 concepts · text overlay + colour palette",
  },
  {
    id: "shorts-script",
    label: "Shorts Script",
    desc: "45-second vertical video script.",
    icon: Clapperboard,
    accent: "from-emerald-500 to-teal-500",
    hint: "3-second hook · 30-60s vertical script",
  },
] as const;

export function YoutubeView() {
  const qc = useQueryClient();
  const [activeTool, setActiveTool] = useState<string>("titles");
  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState("");
  const [intent, setIntent] = useState("educational");
  const [brandVoiceId, setBrandVoiceId] = useState<string>("");
  const [result, setResult] = useState<string>("");
  const history = useGeneratorHistory("youtube");

  const { data: voices } = useQuery<BrandVoice[]>({
    queryKey: ["brand-voices"],
    queryFn: () => api<BrandVoice[]>("/api/brand-voices"),
  });

  const generateM = useMutation({
    mutationFn: () =>
      api<{ result: string; credits: number }>("/api/youtube/generate", {
        method: "POST",
        body: JSON.stringify({
          tool: activeTool,
          input: { topic, audience, intent },
          brandVoiceId: brandVoiceId || undefined,
        }),
      }),
    onSuccess: (data) => {
      setResult(data.result);
      qc.invalidateQueries({ queryKey: ["user"] });
      qc.invalidateQueries({ queryKey: ["generator-history", "youtube"] });
      toast.success(`Generated — ${data.credits} credits left`);
      // Persist to DB-backed history (syncs across devices)
      history.add({
        tool: activeTool,
        toolLabel: tool.label,
        input: topic || "(untitled)",
        result: data.result,
      });
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
        className="relative mb-5 overflow-hidden rounded-2xl border bg-gradient-to-br from-red-500/10 via-rose-500/5 to-transparent p-5 sm:p-6 md:mb-6 md:p-8"
      >
        <div className="absolute inset-0 grid-bg opacity-40" />
        <div className="absolute -top-16 -right-10 h-44 w-44 rounded-full bg-red-500/20 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-red-500 to-rose-500 text-white shadow-glow">
                <Youtube className="h-5 w-5" />
              </div>
              <Badge variant="outline" className="gap-1.5">
                <Sparkles className="h-3 w-3" /> Retention-optimised
              </Badge>
            </div>
            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl md:text-3xl">YouTube Workspace</h2>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Generate high-CTR titles, retention-optimised scripts, SEO descriptions and thumbnail concepts.
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
                    active ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "bg-card hover:border-primary/40"
                  )}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
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
                      <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                        #{idx + 1}
                      </span>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{t.desc}</p>
                    <p className="mt-1 truncate text-[10px] font-medium text-primary/70">{t.hint}</p>
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
              <div>
                <h3 className="text-base font-semibold">{tool.label}</h3>
                <p className="text-xs text-muted-foreground">{tool.desc}</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="yt-topic">Video topic / idea *</Label>
                <Input
                  id="yt-topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. How AI is changing small business marketing"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="yt-audience">
                  {activeTool === "script" ? "Target length" : "Target audience"}
                </Label>
                <Input
                  id="yt-audience"
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  placeholder={
                    activeTool === "script"
                      ? "e.g. 8-12 minutes"
                      : activeTool === "shorts-script"
                      ? "e.g. 30 / 45 / 60 seconds"
                      : "e.g. small business owners"
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="yt-style">Style / type</Label>
                <select
                  id="yt-style"
                  value={intent}
                  onChange={(e) => setIntent(e.target.value)}
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                >
                  <option value="educational">Educational</option>
                  <option value="entertaining">Entertaining</option>
                  <option value="inspirational">Inspirational</option>
                  <option value="controversial">Controversial / hot take</option>
                  <option value="listicle">Listicle</option>
                  <option value="tutorial">Tutorial / how-to</option>
                  <option value="review">Review / comparison</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="yt-voice">Brand voice</Label>
                <select
                  id="yt-voice"
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
                disabled={!topic.trim() || generateM.isPending}
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

            <GeneratorResultPanel
              module="youtube"
              isLoading={generateM.isPending}
              result={result}
              toolLabel={tool.label}
              inputLabel={topic || "(untitled)"}
              onClear={() => setResult("")}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
