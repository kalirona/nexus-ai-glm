"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  MessageSquare,
  FileText,
  Image as ImageIcon,
  Bot,
  Search,
  Megaphone,
  Youtube,
  Palette,
  Command,
  ArrowRight,
  Check,
} from "lucide-react";
import { useWorkspace, type ModuleKey } from "@/store/workspace";
import { motion } from "framer-motion";

const STORAGE_KEY = "nexus-onboarding-dismissed";

const STEPS: {
  title: string;
  desc: string;
  icon: typeof Sparkles;
  module?: ModuleKey;
  accent: string;
}[] = [
  {
    title: "Welcome to NexusAI",
    desc: "Your AI Business Operating System — replace 10+ tools with one workspace. Let's take a quick tour.",
    icon: Sparkles,
    accent: "from-primary to-teal-500",
  },
  {
    title: "AI Chat & Agents",
    desc: "Brainstorm, reason and create with specialised AI agents. Each agent has a unique persona for your task.",
    icon: MessageSquare,
    module: "chat",
    accent: "from-emerald-500 to-teal-500",
  },
  {
    title: "Documents & Images",
    desc: "Generate investor-ready business plans, sales copy, contracts — plus custom AI images for any need.",
    icon: FileText,
    module: "documents",
    accent: "from-amber-500 to-orange-500",
  },
  {
    title: "SEO · Marketing · YouTube",
    desc: "3 full workspaces with 16+ AI tools: keyword research, ad copy, email sequences, video scripts & more.",
    icon: Search,
    module: "seo",
    accent: "from-rose-500 to-pink-500",
  },
  {
    title: "Brand Voice",
    desc: "Define your tone once — it's automatically applied to every document, ad and email you generate.",
    icon: Palette,
    module: "brand-voice",
    accent: "from-fuchsia-500 to-rose-500",
  },
  {
    title: "Pro tip: Press ⌘K",
    desc: "Open the command palette from anywhere to jump between modules, run a Package job, or search actions.",
    icon: Command,
    accent: "from-violet-500 to-fuchsia-500",
  },
];

export function OnboardingOverlay() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const { setActiveModule } = useWorkspace();

  // Check localStorage on mount — only show if not dismissed
  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(STORAGE_KEY);
      if (!dismissed) {
        // Small delay so the app loads first
        const t = setTimeout(() => setOpen(true), 1200);
        return () => clearTimeout(t);
      }
    } catch {
      /* localStorage unavailable */
    }
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  const next = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      dismiss();
    }
  };

  const skip = () => {
    dismiss();
  };

  const goToModule = () => {
    const s = STEPS[step];
    if (s.module) {
      setActiveModule(s.module);
    }
    dismiss();
  };

  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;
  const hasModule = !!current.module;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && dismiss()}>
      <DialogContent className="max-w-md overflow-hidden p-0">
        <DialogTitle className="sr-only">Welcome to NexusAI</DialogTitle>
        <DialogDescription className="sr-only">
          A quick tour of the NexusAI workspace.
        </DialogDescription>

        {/* Gradient header */}
        <div className={`relative overflow-hidden bg-gradient-to-br ${current.accent} p-6 text-white`}>
          <div className="absolute inset-0 grid-bg opacity-30" />
          <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15 backdrop-blur">
              <Icon className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <Badge className="bg-white/20 text-white">
                Step {step + 1} of {STEPS.length}
              </Badge>
            </div>
            <button
              onClick={skip}
              className="text-xs text-white/70 transition-colors hover:text-white"
            >
              Skip tour
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25 }}
          >
            <h2 className="text-lg font-semibold">{current.title}</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">{current.desc}</p>
          </motion.div>

          {/* Progress dots */}
          <div className="mt-5 flex items-center justify-center gap-1.5">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                }`}
                aria-label={`Go to step ${i + 1}`}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="mt-6 flex items-center justify-between gap-2">
            {step > 0 ? (
              <Button variant="ghost" size="sm" onClick={() => setStep(step - 1)}>
                Back
              </Button>
            ) : (
              <div />
            )}
            <div className="flex gap-2">
              {hasModule && (
                <Button variant="outline" size="sm" onClick={goToModule} className="gap-1.5">
                  Try it <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button size="sm" onClick={next} className="gap-1.5">
                {isLast ? (
                  <>
                    <Check className="h-3.5 w-3.5" /> Got it
                  </>
                ) : (
                  <>
                    Next <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
