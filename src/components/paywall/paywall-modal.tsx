"use client";

import { useWorkspace } from "@/store/workspace";
import { PLANS } from "@/lib/constants";
import { Check, Sparkles, X, Zap, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { motion } from "framer-motion";

const FEATURE_REASONS: Record<string, string> = {
  "brand-voice": "Brand Voice profiles are a Pro feature. Save your tone once and apply it everywhere.",
  folders: "Organizing chats into folders is a Pro feature. Keep your workspace tidy.",
  "more-credits": "You've hit your daily credit cap. Upgrade for more monthly credits.",
  "pro-model": "Premium reasoning models are available on Pro and above.",
  exports: "PDF & DOCX export is a Pro feature.",
  teams: "Team seats are available on the Agency plan.",
};

export function PaywallModal() {
  const { paywall, closePaywall, setActiveModule } = useWorkspace();

  const reason = FEATURE_REASONS[paywall.feature] || paywall.reason || "Upgrade to unlock this feature.";

  const goUpgrade = () => {
    closePaywall();
    setActiveModule("billing");
    toast.success("Opening plans…");
  };

  return (
    <Dialog open={paywall.open} onOpenChange={(o) => !o && closePaywall()}>
      <DialogContent className="max-w-2xl overflow-hidden p-0">
        <DialogTitle className="sr-only">Upgrade to continue</DialogTitle>
        <DialogDescription className="sr-only">{reason}</DialogDescription>

        {/* Header band */}
        <div className="relative overflow-hidden bg-gradient-to-br from-primary/15 via-teal-500/8 to-transparent px-6 pt-8 pb-6">
          <div className="absolute inset-0 grid-bg opacity-40" />
          <div className="absolute -top-16 -right-10 h-48 w-48 rounded-full bg-primary/20 blur-3xl" />
          <button
            onClick={closePaywall}
            className="absolute right-4 top-4 rounded-md p-1.5 text-muted-foreground hover:bg-muted"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="relative">
            <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-teal-500 text-primary-foreground shadow-glow">
              <Sparkles className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-semibold tracking-tight md:text-2xl">
              Unlock the full NexusAI
            </h2>
            <p className="mt-1.5 max-w-md text-sm text-muted-foreground">{reason}</p>
          </div>
        </div>

        {/* Plan comparison */}
        <div className="grid gap-3 p-6 pt-2 sm:grid-cols-3">
          {PLANS.filter((p) => p.id !== "free").map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className={cn(
                "relative rounded-xl border p-4 transition-all",
                p.popular ? "border-primary ring-1 ring-primary/30 shadow-glow" : "hover:border-primary/40"
              )}
            >
              {p.popular && (
                <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 gap-1">
                  <Sparkles className="h-3 w-3" /> Popular
                </Badge>
              )}
              <p className="font-semibold">{p.name}</p>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-2xl font-semibold tabular-nums">${p.price}</span>
                <span className="text-xs text-muted-foreground">/mo</span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {p.credits.toLocaleString()} credits
              </p>
              <ul className="mt-3 space-y-1.5">
                {p.features.slice(0, 3).map((f) => (
                  <li key={f} className="flex items-start gap-1.5 text-xs">
                    <Check className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                    <span className="text-muted-foreground">{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                size="sm"
                className="mt-4 w-full"
                variant={p.popular ? "default" : "outline"}
                onClick={goUpgrade}
              >
                Choose {p.name}
                <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </motion.div>
          ))}
        </div>

        <div className="border-t bg-muted/30 px-6 py-3 text-center">
          <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Zap className="h-3 w-3" />
            30-day money-back guarantee · Cancel anytime
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
