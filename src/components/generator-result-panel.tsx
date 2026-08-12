"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import {
  Copy,
  Check,
  Save,
  Loader2,
  FileText,
  History,
  Trash2,
  Clock,
  X,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Markdown } from "@/components/markdown";
import { useGeneratorHistory, type HistoryEntry } from "@/hooks/use-generator-history";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Props {
  module: "seo" | "marketing" | "youtube";
  isLoading: boolean;
  result: string;
  toolLabel: string;
  /** Short label for the input that produced this result (e.g. topic / product) */
  inputLabel: string;
  /** Called when the parent should generate a new result */
  onClear: () => void;
}

/**
 * Shared result panel used by SEO, Marketing and YouTube workspaces.
 * Renders the generated markdown, with Copy + Save-to-Documents buttons
 * and a collapsible "Recent generations" history sidebar.
 */
export function GeneratorResultPanel({
  module,
  isLoading,
  result,
  toolLabel,
  inputLabel,
  onClear,
}: Props) {
  const qc = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [activeHistoryEntry, setActiveHistoryEntry] = useState<HistoryEntry | null>(null);
  const history = useGeneratorHistory(module);

  const copy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    toast.success("Copied to clipboard");
  };

  const saveM = useMutation({
    mutationFn: () =>
      api("/api/documents", {
        method: "POST",
        body: JSON.stringify({
          title: `${toolLabel} — ${inputLabel.slice(0, 40)}${inputLabel.length > 40 ? "…" : ""}`,
          content: result,
          kind: module,
          tags: toolLabel,
        }),
      }),
    onSuccess: () => {
      toast.success("Saved to Documents");
      qc.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="mt-5 space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Generating…
        </div>
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    );
  }

  // Show history entry if selected
  const displayedResult = activeHistoryEntry?.result ?? result;
  const isFromHistory = !!activeHistoryEntry;

  // Empty state
  if (!displayedResult) {
    return (
      <div className="mt-5 flex flex-col items-center gap-2 rounded-xl border border-dashed p-10 text-center">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-muted text-muted-foreground">
          <FileText className="h-5 w-5" />
        </div>
        <p className="text-sm font-medium">Fill in the inputs and generate</p>
        <p className="max-w-sm text-xs text-muted-foreground">
          Each generation costs credits. Output is rendered as Markdown — copy to clipboard, save to Documents, or
          revisit from history.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-5 rounded-xl border bg-muted/30 p-4 sm:p-5"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {isFromHistory ? "From history" : "Result"}
          </p>
          <Badge variant="outline" className="gap-1 text-[11px]">
            <FileText className="h-3 w-3" /> Markdown
          </Badge>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowHistory((v) => !v)}
            className="h-7 gap-1.5 text-xs"
          >
            <History className="h-3.5 w-3.5" />
            History ({history.entries.length})
            {showHistory ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </Button>
          {!isFromHistory && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={copy}
                className="h-7 gap-1.5 text-xs"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy"}
              </Button>
              <Button
                size="sm"
                onClick={() => saveM.mutate()}
                disabled={saveM.isPending}
                className="h-7 gap-1.5 text-xs"
              >
                {saveM.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                Save to Docs
              </Button>
            </>
          )}
          {isFromHistory && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveHistoryEntry(null)}
              className="h-7 gap-1.5 text-xs"
            >
              <X className="h-3.5 w-3.5" /> Close history view
            </Button>
          )}
        </div>
      </div>

      {/* Collapsible history list */}
      {showHistory && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mb-3 overflow-hidden rounded-lg border bg-background"
        >
          {history.entries.length === 0 ? (
            <p className="p-3 text-center text-xs text-muted-foreground">
              No history yet — generate something to see it here.
            </p>
          ) : (
            <div className="max-h-64 overflow-y-auto scroll-thin">
              {history.entries.map((entry) => (
                <div
                  key={entry.id}
                  className={cn(
                    "group flex items-center gap-3 border-b px-3 py-2 text-sm last:border-b-0 transition-colors hover:bg-muted/50",
                    activeHistoryEntry?.id === entry.id && "bg-primary/5"
                  )}
                >
                  <button
                    onClick={() => {
                      setActiveHistoryEntry(entry);
                      setShowHistory(false);
                    }}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <div className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                      <Clock className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">{entry.toolLabel}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{entry.input}</p>
                    </div>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {timeAgo(entry.createdAt)}
                    </span>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                    onClick={() => history.remove(entry.id)}
                    aria-label="Remove from history"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              <button
                onClick={() => {
                  history.clear();
                  toast.success("History cleared");
                }}
                className="w-full p-2 text-center text-[11px] text-muted-foreground transition-colors hover:bg-destructive/5 hover:text-destructive"
              >
                Clear all history
              </button>
            </div>
          )}
        </motion.div>
      )}

      <div className="max-h-[60vh] overflow-y-auto scroll-thin pr-2">
        <Markdown content={displayedResult} />
      </div>
    </motion.div>
  );
}

function timeAgo(epoch: number) {
  const diff = Date.now() - epoch;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
