"use client";

import { Sparkles, Github, Twitter, Shield, Heart } from "lucide-react";
import { PLANS } from "@/lib/constants";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useWorkspace } from "@/store/workspace";
import { toast } from "sonner";

export function Footer() {
  const { data: user } = useCurrentUser();
  const { setActiveModule } = useWorkspace();
  const plan = PLANS.find((p) => p.id === (user?.plan ?? "free"));

  const handleSocial = (platform: string) => {
    toast.info(`${platform} coming soon — follow NexusAI for updates.`);
  };

  return (
    <footer className="mt-auto border-t bg-background">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-3 px-4 py-4 md:flex-row md:items-center md:px-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="grid h-6 w-6 place-items-center rounded-md bg-gradient-to-br from-primary to-teal-500 text-primary-foreground">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <span className="font-medium text-foreground">NexusAI</span>
          <span className="text-muted-foreground/60">·</span>
          <span className="hidden sm:inline">The AI Business Operating System</span>
          <span className="sm:hidden">AI Business OS</span>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground sm:gap-x-5">
          <span className="hidden items-center gap-1.5 sm:inline-flex">
            <Shield className="h-3.5 w-3.5" />
            Enterprise-grade security
          </span>
          <button
            onClick={() => setActiveModule("billing")}
            className="transition-colors hover:text-foreground"
          >
            {plan ? `${plan.name} plan` : "View plans"}
          </button>
          <button
            onClick={() => handleSocial("GitHub")}
            className="transition-colors hover:text-foreground"
            aria-label="GitHub"
          >
            <Github className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => handleSocial("Twitter")}
            className="transition-colors hover:text-foreground"
            aria-label="Twitter"
          >
            <Twitter className="h-3.5 w-3.5" />
          </button>
          <span className="inline-flex items-center gap-1">
            © {new Date().getFullYear()} · Built with <Heart className="h-3 w-3 fill-primary text-primary" />
          </span>
        </div>
      </div>
    </footer>
  );
}
