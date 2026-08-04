"use client";

import { Sparkles, Github, Twitter, Shield } from "lucide-react";
import { PLANS } from "@/lib/constants";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useWorkspace } from "@/store/workspace";

export function Footer() {
  const { data: user } = useCurrentUser();
  const { setActiveModule } = useWorkspace();
  const plan = PLANS.find((p) => p.id === (user?.plan ?? "free"));

  return (
    <footer className="mt-auto border-t bg-background">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-3 px-4 py-4 md:flex-row md:items-center md:px-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="grid h-6 w-6 place-items-center rounded-md bg-gradient-to-br from-primary to-teal-500 text-primary-foreground">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <span className="font-medium text-foreground">NexusAI</span>
          <span className="text-muted-foreground/60">·</span>
          <span>The AI Business Operating System</span>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5" />
            Enterprise-grade security
          </span>
          <button
            onClick={() => setActiveModule("billing")}
            className="transition-colors hover:text-foreground"
          >
            {plan ? `${plan.name} plan` : "View plans"}
          </button>
          <a href="#" className="transition-colors hover:text-foreground" aria-label="GitHub">
            <Github className="h-3.5 w-3.5" />
          </a>
          <a href="#" className="transition-colors hover:text-foreground" aria-label="Twitter">
            <Twitter className="h-3.5 w-3.5" />
          </a>
          <span>© {new Date().getFullYear()} NexusAI</span>
        </div>
      </div>
    </footer>
  );
}
