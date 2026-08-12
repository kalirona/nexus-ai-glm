"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type ImageDto } from "@/lib/api-client";
import { IMAGE_SIZES, IMAGE_PRESETS } from "@/lib/constants";
import {
  Image as ImageIcon,
  Sparkles,
  Loader2,
  Download,
  Trash2,
  Wand2,
  Copy,
  Check,
  Expand,
  Search,
  X,
  Filter,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { motion } from "framer-motion";

const PRESET_PROMPTS: Record<string, string> = {
  graphic: "Clean modern business illustration, flat vector style, professional palette, minimal, centered composition",
  logo: "Minimal geometric logo mark, bold, scalable, premium brand identity, centered on plain background",
  ad: "High-conversion social media ad creative, bold headline space, dynamic composition, premium product photography style",
  social: "Engaging social media post graphic, vibrant, modern, eye-catching, balanced composition",
  thumbnail: "Click-worthy YouTube thumbnail, bold contrast, expressive, dramatic lighting, clear focal point",
  hero: "Wide cinematic website hero image, atmospheric, professional, subtle depth, negative space for text",
};

export function ImagesView() {
  const [prompt, setPrompt] = useState("");
  const [size, setSize] = useState("1024x1024");
  const [kind, setKind] = useState("graphic");
  const [preview, setPreview] = useState<{ base64: string; prompt: string } | null>(null);
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<string>("all");
  const qc = useQueryClient();

  const { data: images = [] } = useQuery<{ id: string; prompt: string; size: string; kind: string; createdAt: string }[]>({
    queryKey: ["images"],
    queryFn: () => api("/api/images"),
  });

  // Build kind filter chips from existing images
  const kindCounts: Record<string, number> = {};
  for (const img of images) {
    kindCounts[img.kind] = (kindCounts[img.kind] ?? 0) + 1;
  }
  const kindChips = Object.entries(kindCounts).sort((a, b) => b[1] - a[1]);

  // Filter images by search + kind
  const filteredImages = images.filter((img) => {
    const matchSearch =
      !search.trim() || img.prompt.toLowerCase().includes(search.toLowerCase());
    const matchKind = kindFilter === "all" || img.kind === kindFilter;
    return matchSearch && matchKind;
  });

  const generate = useMutation({
    mutationFn: async (vars: { prompt: string; size: string; kind: string }) =>
      api<{ image: ImageDto; credits: number }>("/api/images/generate", {
        method: "POST",
        body: JSON.stringify(vars),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["images"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["user"] });
      toast.success("Image generated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeImage = useMutation({
    mutationFn: (id: string) => api(`/api/images/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["images"] });
      toast.success("Image deleted");
    },
  });

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    const enriched = prompt.trim();
    generate.mutate({ prompt: enriched, size, kind });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        {/* Composer */}
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight md:text-2xl">AI Image Studio</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Logos, ads, thumbnails, hero images & more. 8 credits per image.
            </p>
          </div>

          <Card className="space-y-4 p-5">
            {/* Preset */}
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Type</Label>
              <div className="grid grid-cols-3 gap-2">
                {IMAGE_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setKind(p.id);
                      setPrompt((prev) => prev || "");
                    }}
                    className={cn(
                      "rounded-lg border p-2 text-center transition-all hover:border-primary/40",
                      kind === p.id ? "border-primary bg-primary/5" : "bg-card"
                    )}
                  >
                    <ImageIcon className="mx-auto h-4 w-4 text-primary" />
                    <p className="mt-1 text-[11px] font-medium leading-tight">{p.label}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Prompt */}
            <div className="space-y-1.5">
              <Label htmlFor="prompt" className="text-sm font-medium">Describe your image</Label>
              <Textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="A bold logo for a coffee brand called 'Brew', emerald & cream palette, geometric cup mark…"
                rows={4}
              />
              <button
                onClick={() => setPrompt((p) => (p ? `${p}, ${PRESET_PROMPTS[kind]}` : PRESET_PROMPTS[kind]))}
                className="text-[11px] text-primary hover:underline"
              >
                + Enhance with style presets
              </button>
            </div>

            {/* Size */}
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Dimensions
              </Label>
              <div className="grid grid-cols-2 gap-1.5">
                {IMAGE_SIZES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSize(s.id)}
                    className={cn(
                      "rounded-lg border px-2.5 py-1.5 text-left transition-all hover:border-primary/40",
                      size === s.id ? "border-primary bg-primary/5" : "bg-card"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">{s.label}</span>
                      <span className="text-[10px] text-muted-foreground">{s.ratio}</span>
                    </div>
                    <p className="truncate text-[10px] text-muted-foreground">{s.use}</p>
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={!prompt.trim() || generate.isPending}
              className="w-full gap-2"
              size="lg"
            >
              {generate.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {generate.isPending ? "Generating…" : "Generate image"}
            </Button>
          </Card>
        </div>

        {/* Gallery */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-base font-semibold">Gallery</h3>
            <Badge variant="outline">
              {filteredImages.length}
              {filteredImages.length !== images.length && ` of ${images.length}`} images
            </Badge>
          </div>

          {/* Search + kind filters */}
          {images.length > 0 && (
            <div className="mb-4 space-y-2.5">
              <div className="relative max-w-sm">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by prompt…"
                  className="h-9 pl-8 pr-8 text-sm"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label="Clear search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              {kindChips.length > 1 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <Filter className="h-3 w-3 text-muted-foreground" />
                  <button
                    onClick={() => setKindFilter("all")}
                    className={cn(
                      "rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors",
                      kindFilter === "all"
                        ? "border-primary bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    All ({images.length})
                  </button>
                  {kindChips.map(([k, count]) => (
                    <button
                      key={k}
                      onClick={() => setKindFilter(k)}
                      className={cn(
                        "rounded-full border px-2.5 py-0.5 text-[11px] font-medium capitalize transition-colors",
                        kindFilter === k
                          ? "border-primary bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {k} ({count})
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {generate.isPending && (
            <Card className="mb-4 grid aspect-square place-items-center border-dashed">
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm">Painting your image…</p>
              </div>
            </Card>
          )}

          {images.length === 0 && !generate.isPending ? (
            <Card className="flex min-h-[400px] flex-col items-center justify-center gap-3 text-center">
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-primary/10">
                <ImageIcon className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="font-medium">No images yet</p>
                <p className="text-sm text-muted-foreground">Describe what you need and hit generate.</p>
              </div>
            </Card>
          ) : filteredImages.length === 0 ? (
            <Card className="flex min-h-[200px] flex-col items-center justify-center gap-3 text-center">
              <Search className="h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                No images match "{search}"
                {kindFilter !== "all" && ` in ${kindFilter}`}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setKindFilter("all");
                }}
              >
                Clear filters
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {filteredImages.map((img, i) => (
                <ImageCard
                  key={img.id}
                  id={img.id}
                  onLoad={async () => {
                    const full = await api<{ base64: string; prompt: string }>(`/api/images/${img.id}`);
                    return full;
                  }}
                  index={i}
                  onPreview={async () => {
                    const full = await api<{ base64: string; prompt: string }>(`/api/images/${img.id}`);
                    setPreview({ base64: full.base64, prompt: full.prompt });
                  }}
                  onDelete={() => removeImage.mutate(img.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Preview dialog */}
      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-3xl">
          <DialogTitle className="text-sm font-medium text-muted-foreground">Preview</DialogTitle>
          {preview && (
            <div className="space-y-3">
              <img
                src={`data:image/png;base64,${preview.base64}`}
                alt={preview.prompt}
                className="w-full rounded-lg"
              />
              <p className="text-xs text-muted-foreground">{preview.prompt}</p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    const a = document.createElement("a");
                    a.href = `data:image/png;base64,${preview.base64}`;
                    a.download = "nexusai-image.png";
                    a.click();
                  }}
                >
                  <Download className="mr-1.5 h-3.5 w-3.5" /> Download
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ImageCard({
  id,
  index,
  onLoad,
  onPreview,
  onDelete,
}: {
  id: string;
  index: number;
  onLoad: () => Promise<{ base64: string; prompt: string }>;
  onPreview: () => void;
  onDelete: () => void;
}) {
  const [data, setData] = useState<{ base64: string; prompt: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const d = await onLoad();
        if (alive) setData(d);
      } catch {
        /* ignore */
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [onLoad]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.03 }}
    >
      <Card className="group relative aspect-square overflow-hidden">
        {loading ? (
          <div className="flex h-full w-full items-center justify-center bg-muted">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : data ? (
          <>
            <img
              src={`data:image/png;base64,${data.base64}`}
              alt={data.prompt}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between p-2 opacity-0 transition-opacity group-hover:opacity-100">
              <p className="line-clamp-1 text-[11px] text-white/90">{data.prompt}</p>
              <div className="flex gap-1">
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-7 w-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPreview();
                  }}
                >
                  <Expand className="h-3 w-3" />
                </Button>
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-7 w-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    const a = document.createElement("a");
                    a.href = `data:image/png;base64,${data.base64}`;
                    a.download = `nexusai-${id}.png`;
                    a.click();
                  }}
                >
                  <Download className="h-3 w-3" />
                </Button>
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-7 w-7 text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <ImageIcon className="h-6 w-6" />
          </div>
        )}
      </Card>
    </motion.div>
  );
}
