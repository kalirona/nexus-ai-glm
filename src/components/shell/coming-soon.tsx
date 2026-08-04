"use client";

import { Construction, type LucideIcon } from "lucide-react";
import { Search, Megaphone, Youtube } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/store/workspace";

const META: Record<string, { title: string; desc: string; icon: LucideIcon; bullets: string[] }> = {
  seo: {
    title: "SEO Workspace",
    desc: "Audit sites, research keywords, build topic clusters and optimise content — all powered by AI.",
    icon: Search,
    bullets: ["Full site audits", "Keyword & cluster research", "Internal linking map", "Schema generation", "Competitor research"],
  },
  marketing: {
    title: "Marketing Workspace",
    desc: "Plan campaigns, write ad copy for Facebook & Google, build funnels and sales pages.",
    icon: Megaphone,
    bullets: ["Facebook & Google Ads", "Email campaign sequences", "Landing pages & funnels", "Product descriptions", "Brand voice profiles"],
  },
  youtube: {
    title: "YouTube Workspace",
    desc: "Generate titles, scripts, hooks, tags and thumbnail ideas — and repurpose long-form into shorts.",
    icon: Youtube,
    bullets: ["High-CTR titles", "Retention-optimised scripts", "Hooks every 30s", "SEO descriptions & tags", "Thumbnail concepts"],
  },
};

export function ComingSoon({ module }: { module: string }) {
  const meta = META[module] ?? META.seo;
  const Icon = meta.icon;
  const { setActiveModule } = useWorkspace();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 md:px-6 md:py-16">
      <Card className="relative overflow-hidden border-2 p-8 md:p-12">
        <div className="absolute inset-0 grid-bg opacity-50" />
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-6">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/15 text-primary">
              <Icon className="h-6 w-6" />
            </div>
            <Badge variant="outline" className="text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10">
              <Construction className="mr-1 h-3 w-3" />
              In active development
            </Badge>
          </div>

          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">{meta.title}</h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">{meta.desc}</p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {meta.bullets.map((b) => (
              <div key={b} className="flex items-center gap-2.5 rounded-lg border bg-card/60 p-3 text-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                {b}
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button onClick={() => setActiveModule("chat")}>Try it in AI Chat now</Button>
            <Button variant="outline" onClick={() => setActiveModule("dashboard")}>
              Back to dashboard
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
