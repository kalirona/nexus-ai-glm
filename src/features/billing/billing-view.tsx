"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { PLANS } from "@/lib/constants";
import {
  Check,
  Sparkles,
  Zap,
  TrendingUp,
  CreditCard,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useWorkspace } from "@/store/workspace";

interface BillingData {
  current: { plan: string; credits: number; creditsResetAt: string | null; name: string; email: string };
  plans: typeof PLANS;
  transactions: { id: string; amount: number; reason: string; refId: string | null; createdAt: string }[];
}

const CREDIT_PACKS = [
  { id: "pack-1k", credits: 1000, price: 9, bonus: 0 },
  { id: "pack-5k", credits: 5000, price: 39, bonus: 500 },
  { id: "pack-20k", credits: 20000, price: 129, bonus: 3000 },
];

const REASON_LABEL: Record<string, string> = {
  chat: "AI Chat",
  image: "Image generation",
  document: "Document generation",
  grant: "Plan grant",
  refill: "Credit pack",
};

export function BillingView() {
  const { data, isLoading } = useQuery<BillingData>({
    queryKey: ["billing"],
    queryFn: () => api<BillingData>("/api/billing"),
  });
  const { setActiveModule } = useWorkspace();

  const plan = PLANS.find((p) => p.id === (data?.current.plan ?? "free")) ?? PLANS[0];
  const credits = data?.current.credits ?? 0;
  const creditPct = Math.min(100, Math.round((credits / plan.credits) * 100));

  const buyPack = (pack: (typeof CREDIT_PACKS)[number]) => {
    toast.success(`+${(pack.credits + pack.bonus).toLocaleString()} credits added (demo)`);
  };

  const upgrade = (name: string) => {
    toast.success(`Switched to ${name} (demo) — no payment taken`);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold tracking-tight md:text-2xl">Plans & Credits</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Fair, transparent pricing. One subscription, every AI module included.
        </p>
      </div>

      {/* Current plan overview */}
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-center gap-2 text-muted-foreground">
            <CreditCard className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wide">Current plan</span>
          </div>
          <p className="mt-3 text-2xl font-semibold">{plan.name}</p>
          <p className="text-sm text-muted-foreground">${plan.price}/mo · {plan.cadence}</p>
          <div className="mt-3">
            <Badge variant="secondary" className="gap-1">
              <Sparkles className="h-3 w-3" /> {plan.tagline}
            </Badge>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Zap className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wide">Credit balance</span>
          </div>
          <p className="mt-3 text-2xl font-semibold tabular-nums">{credits.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground">of {plan.credits.toLocaleString()} this cycle</p>
          <Progress value={creditPct} className="mt-3 h-2" />
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wide">Cycle resets</span>
          </div>
          <p className="mt-3 text-2xl font-semibold">
            {data?.current.creditsResetAt
              ? new Date(data.current.creditsResetAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })
              : "—"}
          </p>
          <p className="text-sm text-muted-foreground">
            {data?.current.creditsResetAt
              ? `${Math.ceil((new Date(data.current.creditsResetAt).getTime() - Date.now()) / 86400000)} days left`
              : "No reset scheduled"}
          </p>
        </Card>
      </div>

      {/* Plans */}
      <div className="mb-10">
        <h3 className="mb-4 text-base font-semibold">Choose your plan</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((p, i) => {
            const isCurrent = p.id === plan.id;
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card
                  className={cn(
                    "relative flex h-full flex-col p-5 transition-all",
                    p.popular ? "border-primary ring-1 ring-primary/30 shadow-glow" : "",
                    !isCurrent && "hover:border-primary/40 hover:shadow-md"
                  )}
                >
                  {p.popular && (
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                      <Badge className="gap-1 shadow-sm">
                        <Sparkles className="h-3 w-3" /> Most popular
                      </Badge>
                    </div>
                  )}
                  <div className="mt-2">
                    <p className="font-semibold">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.tagline}</p>
                  </div>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-3xl font-semibold tabular-nums">${p.price}</span>
                    <span className="text-sm text-muted-foreground">/{p.cadence === "daily" ? "day" : "mo"}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {p.credits.toLocaleString()} credits {p.cadence}
                  </p>
                  <ul className="mt-4 flex-1 space-y-2">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                        <span className="text-muted-foreground">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="mt-5 w-full"
                    variant={p.popular ? "default" : "outline"}
                    disabled={isCurrent}
                    onClick={() => upgrade(p.name)}
                  >
                    {isCurrent ? "Current plan" : p.cta}
                  </Button>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Credit packs */}
      <div className="mb-10">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold">Top-up credit packs</h3>
            <p className="text-xs text-muted-foreground">No commitment — credits never expire while subscribed.</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {CREDIT_PACKS.map((pack) => (
            <Card key={pack.id} className="flex items-center justify-between p-5 transition-all hover:border-primary/40 hover:shadow-md">
              <div>
                <p className="font-semibold">{pack.credits.toLocaleString()} credits</p>
                {pack.bonus > 0 && (
                  <Badge variant="secondary" className="mt-1 text-[10px]">
                    +{pack.bonus.toLocaleString()} bonus
                  </Badge>
                )}
                <p className="mt-1 text-2xl font-semibold tabular-nums">${pack.price}</p>
              </div>
              <Button onClick={() => buyPack(pack)}>Buy</Button>
            </Card>
          ))}
        </div>
      </div>

      {/* Transactions */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold">Recent activity</h3>
          <Receipt className="h-4 w-4 text-muted-foreground" />
        </div>
        <Card className="overflow-hidden">
          {isLoading ? (
            <div className="h-40 animate-pulse bg-muted" />
          ) : (data?.transactions ?? []).length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <Receipt className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No transactions yet — start creating to see usage here.</p>
              <Button variant="outline" size="sm" className="mt-1" onClick={() => setActiveModule("chat")}>
                Start a chat
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {data?.transactions.slice(0, 12).map((t) => (
                <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                  <div
                    className={cn(
                      "grid h-9 w-9 place-items-center rounded-lg",
                      t.amount < 0 ? "bg-rose-500/10 text-rose-500" : "bg-emerald-500/10 text-emerald-500"
                    )}
                  >
                    {t.amount < 0 ? <ArrowDownRight className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{REASON_LABEL[t.reason] ?? t.reason}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(t.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <span className={cn("text-sm font-semibold tabular-nums", t.amount < 0 ? "text-rose-500" : "text-emerald-500")}>
                    {t.amount < 0 ? "−" : "+"}{Math.abs(t.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
