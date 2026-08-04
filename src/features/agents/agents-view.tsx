"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { AGENTS, type AgentDef } from "@/lib/constants";
import { useWorkspace } from "@/store/workspace";
import {
  Briefcase,
  Megaphone,
  Search,
  Microscope,
  Code2,
  Headset,
  Globe,
  Youtube,
  ArrowRight,
  Sparkles,
  Check,
  X,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const ICONS: Record<string, typeof Briefcase> = {
  Briefcase,
  Megaphone,
  Search,
  Microscope,
  Code2,
  Headset,
  Globe,
  Youtube,
};

const COLOR_MAP: Record<string, string> = {
  emerald: "from-emerald-500 to-teal-500",
  rose: "from-rose-500 to-pink-500",
  amber: "from-amber-500 to-orange-500",
  cyan: "from-cyan-500 to-teal-500",
  violet: "from-violet-500 to-fuchsia-500",
  sky: "from-sky-500 to-teal-500",
  teal: "from-teal-500 to-emerald-500",
  red: "from-red-500 to-rose-500",
};

const CATEGORIES = ["All", "Strategy", "Marketing", "Growth", "Research", "Engineering", "Support", "Web", "Content"];

export function AgentsView() {
  const { setPendingAgent, setActiveModule, setActiveChat } = useWorkspace();
  const [category, setCategory] = useState("All");
  const [selected, setSelected] = useState<AgentDef | null>(null);

  const filtered = category === "All" ? AGENTS : AGENTS.filter((a) => a.category === category);

  const launch = (agent: AgentDef) => {
    setPendingAgent({
      key: agent.key,
      name: agent.name,
      systemPrompt: agent.systemPrompt,
      greeting: `${agent.description} Ask me anything to get started.`,
    });
    setActiveChat(null);
    setActiveModule("chat");
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold tracking-tight md:text-2xl">AI Agents</h2>
          <Badge variant="outline" className="text-[10px]">{AGENTS.length} specialists</Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Purpose-built assistants that know your business. Each agent ships with a tuned persona, framework & output style.
        </p>
      </div>

      {/* Category filter */}
      <div className="mb-5 flex flex-wrap gap-1.5">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              category === c
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:text-foreground hover:border-foreground/20"
            )}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((agent, i) => {
          const Icon = ICONS[agent.icon] ?? Briefcase;
          const gradient = COLOR_MAP[agent.color] ?? COLOR_MAP.emerald;
          return (
            <motion.div
              key={agent.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Card className="group relative flex h-full flex-col overflow-hidden p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg">
                <div className={cn("absolute -top-12 -right-12 h-32 w-32 rounded-full bg-gradient-to-br opacity-10 blur-2xl", gradient)} />
                <div className="relative flex items-start justify-between">
                  <div className={cn("grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-sm", gradient)}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <Badge variant="outline" className="text-[10px]">{agent.category}</Badge>
                </div>
                <div className="relative mt-4 flex-1">
                  <h3 className="font-semibold">{agent.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{agent.description}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {agent.capabilities.slice(0, 3).map((cap) => (
                      <span key={cap} className="rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                        {cap}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="relative mt-4 flex gap-2">
                  <Button size="sm" className="flex-1 gap-1.5" onClick={() => launch(agent)}>
                    <Sparkles className="h-3.5 w-3.5" /> Start chat
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setSelected(agent)}>
                    Details
                  </Button>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Detail sheet (inline card) */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => setSelected(null)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <Card className="p-6">
              <button
                onClick={() => setSelected(null)}
                className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground hover:bg-muted"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-3">
                <div className={cn("grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br text-white", COLOR_MAP[selected.color])}>
                  {(() => { const I = ICONS[selected.icon] ?? Briefcase; return <I className="h-6 w-6" />; })()}
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{selected.name}</h3>
                  <p className="text-sm text-muted-foreground">{selected.description}</p>
                </div>
              </div>

              <div className="mt-5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Capabilities</p>
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  {selected.capabilities.map((cap) => (
                    <div key={cap} className="flex items-center gap-1.5 text-sm">
                      <Check className="h-3.5 w-3.5 text-primary" /> {cap}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Persona</p>
                <p className="mt-2 rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
                  {selected.systemPrompt}
                </p>
              </div>

              <Button className="mt-5 w-full gap-2" onClick={() => { launch(selected); setSelected(null); }}>
                Start chatting with {selected.name}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Card>
          </motion.div>
        </div>
      )}
    </div>
  );
}
