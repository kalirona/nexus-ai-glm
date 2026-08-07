"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type ChatDto, type MessageDto } from "@/lib/api-client";
import { useWorkspace } from "@/store/workspace";
import { useCurrentUser } from "@/hooks/use-current-user";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Plus,
  Send,
  Pin,
  PinOff,
  Trash2,
  Search,
  MessageSquare,
  Sparkles,
  Copy,
  Check,
  Pencil,
  ChevronDown,
  ChevronRight,
  FolderPlus,
  Folder as FolderIcon,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Markdown } from "@/components/markdown";
import { motion } from "framer-motion";

interface ChatWithMessages extends ChatDto {
  messages: MessageDto[];
}

const SUGGESTIONS = [
  { icon: "💡", title: "Brainstorm a launch", prompt: "Brainstorm 10 creative launch ideas for an AI accounting SaaS targeting freelancers. Prioritise low-cost, high-signal channels." },
  { icon: "📊", title: "Analyse my funnel", prompt: "My landing page converts at 2.1% and trial-to-paid is 18%. Suggest 5 specific, prioritised experiments to lift revenue." },
  { icon: "✍️", title: "Write a pitch", prompt: "Write a crisp 60-second investor pitch for an AI Business Operating System that replaces 10 SaaS tools." },
  { icon: "🧩", title: "Design a pricing page", prompt: "Draft a 3-tier pricing page structure (Free, Pro $49, Agency $149) with feature comparison and a compelling headline." },
];

export function ChatView() {
  const { activeChatId, setActiveChat, pendingAgent, setPendingAgent } = useWorkspace();
  const qc = useQueryClient();
  const { data: user } = useCurrentUser();

  const { data: chats = [] } = useQuery<ChatDto[]>({
    queryKey: ["chats"],
    queryFn: () => api<ChatDto[]>("/api/chats"),
  });

  const { data: activeChat } = useQuery<ChatWithMessages>({
    queryKey: ["chat", activeChatId],
    queryFn: async () => {
      if (!activeChatId) return null;
      const res = await api<ChatWithMessages>(`/api/chats/${activeChatId}`);
      return res;
    },
    enabled: !!activeChatId,
  });

  // Local streaming state — appended on top of persisted messages
  const [streamingText, setStreamingText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [draft, setDraft] = useState("");
  // Model selection is managed ONLY in AI Infrastructure — chat always uses "auto"
  const model = "auto";
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Folders
  const { data: folders = [] } = useQuery<{ id: string; name: string; color: string; chats: { id: string; title: string; updatedAt: string; pinned: boolean; model: string }[] }[]>({
    queryKey: ["folders"],
    queryFn: () => api("/api/folders?kind=chat"),
  });

  const createFolder = useMutation({
    mutationFn: (name: string) =>
      api("/api/folders", { method: "POST", body: JSON.stringify({ name, kind: "chat", color: "emerald" }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["folders"] });
      setNewFolderName("");
      setShowNewFolder(false);
      toast.success("Folder created");
    },
  });

  const deleteFolder = useMutation({
    mutationFn: (id: string) => api(`/api/folders/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["folders"] });
      qc.invalidateQueries({ queryKey: ["chats"] });
      toast.success("Folder deleted");
    },
  });

  const moveChatToFolder = useMutation({
    mutationFn: ({ chatId, folderId }: { chatId: string; folderId: string | null }) =>
      api(`/api/chats/${chatId}`, { method: "PATCH", body: JSON.stringify({ folderId }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chats"] });
      qc.invalidateQueries({ queryKey: ["folders"] });
    },
  });

  const messages = activeChat?.messages ?? [];
  const chatFolderIds = new Set(folders.flatMap((f) => f.chats.map((c) => c.id)));
  const pinned = chats.filter((c) => c.pinned && matchSearch(c, search) && !chatFolderIds.has(c.id));
  const recent = chats.filter((c) => !c.pinned && matchSearch(c, search) && !chatFolderIds.has(c.id));

  // Auto-scroll while streaming
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [streamingText, messages.length, activeChatId]);

  const newChat = useCallback(() => {
    setActiveChat(null);
    setStreamingText("");
    setDraft("");
  }, [setActiveChat]);

  const deleteChat = useMutation({
    mutationFn: (id: string) => api(`/api/chats/${id}`, { method: "DELETE" }),
    onSuccess: (_, id) => {
      if (activeChatId === id) setActiveChat(null);
      qc.invalidateQueries({ queryKey: ["chats"] });
      toast.success("Conversation deleted");
    },
  });

  const togglePin = useMutation({
    mutationFn: ({ id, pinned }: { id: string; pinned: boolean }) =>
      api(`/api/chats/${id}`, { method: "PATCH", body: JSON.stringify({ pinned }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chats"] }),
  });

  const renameChat = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      api(`/api/chats/${id}`, { method: "PATCH", body: JSON.stringify({ title }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chats"] }),
  });

  const sendMessage = useCallback(
    async (text: string) => {
      const content = text.trim();
      if (!content || isStreaming) return;

      setDraft("");
      setStreamingText("");
      setIsStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chatId: activeChatId,
            message: content,
            model,
            systemPrompt: pendingAgent?.systemPrompt,
            title: pendingAgent ? pendingAgent.name : undefined,
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `Request failed (${res.status})`);
        }
        if (!res.body) throw new Error("No response stream");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let chatId = activeChatId;

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() ?? "";
          for (const part of parts) {
            const line = part.trim();
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            try {
              const evt = JSON.parse(payload);
              if (evt.type === "meta" && evt.chatId) {
                chatId = evt.chatId;
                if (!activeChatId) setActiveChat(evt.chatId);
              } else if (evt.type === "delta") {
                setStreamingText((prev) => prev + evt.content);
              } else if (evt.type === "done") {
                if (typeof evt.credits === "number") {
                  qc.invalidateQueries({ queryKey: ["user"] });
                }
              } else if (evt.type === "error") {
                toast.error(evt.error || "Stream error");
              }
            } catch {
              /* ignore */
            }
          }
        }

        // Refresh the chat to load the persisted assistant message
        if (chatId) {
          qc.invalidateQueries({ queryKey: ["chats"] });
          qc.invalidateQueries({ queryKey: ["chat", chatId] });
          qc.invalidateQueries({ queryKey: ["dashboard"] });
        }
        // Clear the pending agent once we've sent the first message
        if (pendingAgent) setPendingAgent(null);
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          // user stopped — still persist partial via backend flush
        } else {
          toast.error(err instanceof Error ? err.message : "Failed to send message");
        }
      } finally {
        setIsStreaming(false);
        setStreamingText("");
        abortRef.current = null;
        if (user) qc.invalidateQueries({ queryKey: ["user"] });
      }
    },
    [activeChatId, isStreaming, model, setActiveChat, qc, user, pendingAgent, setPendingAgent]
  );

  const stop = () => {
    abortRef.current?.abort();
  };

  const regenerate = () => {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (lastUser && !isStreaming) sendMessage(lastUser.content);
  };

  const exportChat = () => {
    if (!activeChat) return;
    const md = `# ${activeChat.title}\n\n` + messages.map((m) => `**${m.role === "user" ? "You" : "NexusAI"}:**\n\n${m.content}`).join("\n\n---\n\n");
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeChat.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported as Markdown");
  };

  const copyMessage = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="flex h-full">
      {/* Chat list */}
      <div className="hidden lg:flex w-72 shrink-0 flex-col border-r bg-sidebar/40">
        <div className="p-3">
          <Button className="w-full justify-start gap-2" onClick={newChat}>
            <Plus className="h-4 w-4" /> New chat
          </Button>
          <div className="relative mt-3">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search chats…"
              className="h-9 pl-8"
            />
          </div>
        </div>
        <ScrollArea className="flex-1 px-2 pb-3">
          {/* Folders */}
          {folders.length > 0 && (
            <Section label="Folders" action={
              <button
                onClick={() => setShowNewFolder((s) => !s)}
                className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="New folder"
              >
                <FolderPlus className="h-3.5 w-3.5" />
              </button>
            }>
              {showNewFolder && (
                <div className="mb-1.5 flex gap-1.5 px-1">
                  <Input
                    autoFocus
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newFolderName.trim()) createFolder.mutate(newFolderName.trim());
                      if (e.key === "Escape") { setShowNewFolder(false); setNewFolderName(""); }
                    }}
                    placeholder="Folder name…"
                    className="h-8 text-sm"
                  />
                  <Button size="sm" className="h-8 px-2" onClick={() => newFolderName.trim() && createFolder.mutate(newFolderName.trim())}>
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
              {folders.map((f) => {
                const expanded = expandedFolders[f.id] ?? true;
                return (
                  <div key={f.id} className="group/folder mb-0.5">
                    <div className="flex items-center gap-1 rounded-md px-1.5 py-1.5 hover:bg-sidebar-accent/60">
                      <button
                        onClick={() => setExpandedFolders((s) => ({ ...s, [f.id]: !expanded }))}
                        className="text-muted-foreground hover:text-foreground"
                        aria-label={expanded ? "Collapse" : "Expand"}
                      >
                        {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                      </button>
                      <FolderIcon className="h-4 w-4 text-primary/70" />
                      <span className="flex-1 truncate text-sm font-medium">{f.name}</span>
                      <span className="text-[10px] text-muted-foreground">{f.chats.length}</span>
                      <button
                        onClick={() => deleteFolder.mutate(f.id)}
                        className="opacity-0 transition-opacity group-hover/folder:opacity-100 text-muted-foreground hover:text-destructive"
                        aria-label="Delete folder"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                    {expanded && f.chats.length > 0 && (
                      <div className="ml-4 border-l pl-1">
                        {f.chats.map((c) => (
                          <ChatRow
                            key={c.id}
                            chat={{ ...c, folderId: f.id } as ChatDto}
                            active={c.id === activeChatId}
                            onClick={() => setActiveChat(c.id)}
                            onMoveToFolder={(targetId) => moveChatToFolder.mutate({ chatId: c.id, folderId: targetId })}
                            folders={folders}
                          />
                        ))}
                      </div>
                    )}
                    {expanded && f.chats.length === 0 && (
                      <p className="ml-7 py-1 text-[11px] text-muted-foreground/60">Empty</p>
                    )}
                  </div>
                );
              })}
            </Section>
          )}
          {pinned.length > 0 && (
            <Section label="Pinned">
              {pinned.map((c) => (
                <ChatRow
                  key={c.id}
                  chat={c}
                  active={c.id === activeChatId}
                  onClick={() => setActiveChat(c.id)}
                  onMoveToFolder={(targetId) => moveChatToFolder.mutate({ chatId: c.id, folderId: targetId })}
                  folders={folders}
                />
              ))}
            </Section>
          )}
          <Section label="Recent">
            {recent.length === 0 ? (
              <p className="px-2 py-6 text-center text-xs text-muted-foreground">No conversations yet</p>
            ) : (
              recent.map((c) => (
                <ChatRow
                  key={c.id}
                  chat={c}
                  active={c.id === activeChatId}
                  onClick={() => setActiveChat(c.id)}
                  onMoveToFolder={(targetId) => moveChatToFolder.mutate({ chatId: c.id, folderId: targetId })}
                  folders={folders}
                />
              ))
            )}
          </Section>
        </ScrollArea>
      </div>

      {/* Thread */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Thread header */}
        <div className="flex items-center gap-2 border-b px-4 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {activeChat?.title ?? "New conversation"}
            </p>
            <p className="text-xs text-muted-foreground">
              {messages.length} {messages.length === 1 ? "message" : "messages"}
            </p>
          </div>

          {/* Model selector removed from chat UI — managed only in AI Infrastructure */}

          {activeChat && (
            <>
              <Button variant="ghost" size="sm" onClick={() => togglePin.mutate({ id: activeChat.id, pinned: !activeChat.pinned })}>
                {activeChat.pinned ? <PinOff className="mr-1.5 h-3.5 w-3.5" /> : <Pin className="mr-1.5 h-3.5 w-3.5" />}
                {activeChat.pinned ? "Unpin" : "Pin"}
              </Button>
              <Button variant="ghost" size="sm" onClick={exportChat}>
                <Copy className="mr-1.5 h-3.5 w-3.5" /> Export
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => deleteChat.mutate(activeChat.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto scroll-thin">
          {!activeChatId && messages.length === 0 ? (
            <EmptyState
              onPick={(p) => sendMessage(p)}
              disabled={isStreaming}
              credits={user?.credits ?? 0}
              agent={pendingAgent}
              onClearAgent={() => setPendingAgent(null)}
            />
          ) : (
            <div className="mx-auto max-w-3xl px-4 py-6 md:px-6">
              {messages.map((m) => (
                <MessageRow key={m.id} message={m} copied={copiedId === m.id} onCopy={() => copyMessage(m.id, m.content)} />
              ))}
              {streamingText && (
                <MessageRow
                  message={{ id: "streaming", role: "assistant", content: streamingText, model, createdAt: new Date().toISOString() }}
                  streaming
                  onCopy={() => copyMessage("streaming", streamingText)}
                  copied={false}
                />
              )}
              {isStreaming && !streamingText && (
                <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
                  <span className="flex gap-1">
                    <span className="h-2 w-2 rounded-full bg-primary animate-pulse-dot" />
                    <span className="h-2 w-2 rounded-full bg-primary animate-pulse-dot [animation-delay:0.15s]" />
                    <span className="h-2 w-2 rounded-full bg-primary animate-pulse-dot [animation-delay:0.3s]" />
                  </span>
                  NexusAI is thinking…
                </div>
              )}
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="border-t bg-background/80 glass px-4 py-3 md:px-6">
          <div className="mx-auto max-w-3xl">
            <div className="relative flex items-end gap-2 rounded-2xl border bg-card p-2 shadow-sm focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15">
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage(draft);
                  }
                }}
                placeholder="Message NexusAI…  (⏎ to send, Shift+⏎ for newline)"
                rows={1}
                className="min-h-[44px] max-h-48 resize-none border-0 bg-transparent px-2 py-2 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              {isStreaming ? (
                <Button size="icon" variant="secondary" className="h-9 w-9 shrink-0 rounded-xl" onClick={stop} aria-label="Stop">
                  <span className="h-3 w-3 rounded-sm bg-foreground" />
                </Button>
              ) : (
                <Button
                  size="icon"
                  className="h-9 w-9 shrink-0 rounded-xl"
                  disabled={!draft.trim() || !user}
                  onClick={() => sendMessage(draft)}
                  aria-label="Send"
                >
                  <Send className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div className="mt-2 flex items-center justify-between px-1 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Zap className="h-3 w-3" /> 1 credit / message
              </span>
              <span>Powered by NexusAI</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function matchSearch(c: ChatDto, q: string) {
  if (!q) return true;
  return c.title.toLowerCase().includes(q.toLowerCase());
}

function Section({ label, children, action }: { label: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between px-2 pb-1">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">{label}</p>
        {action}
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function ChatRow({
  chat,
  active,
  onClick,
  onMoveToFolder,
  folders = [],
}: {
  chat: ChatDto;
  active: boolean;
  onClick: () => void;
  onMoveToFolder?: (folderId: string | null) => void;
  folders?: { id: string; name: string }[];
}) {
  const qc = useQueryClient();
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 transition-colors",
        active ? "bg-sidebar-accent" : "hover:bg-sidebar-accent/60"
      )}
    >
      <MessageSquare className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "text-muted-foreground")} />
      <span className="min-w-0 flex-1 truncate text-sm">{chat.title}</span>
      {chat.pinned && <Pin className="h-3 w-3 text-primary" />}
      {onMoveToFolder && folders.length > 0 && (
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              className="opacity-0 transition-opacity group-hover:opacity-100 text-muted-foreground hover:text-foreground"
              aria-label="Move to folder"
            >
              <Pencil className="h-3 w-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuLabel className="text-xs text-muted-foreground">Move to folder</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {folders.map((f) => (
              <DropdownMenuItem key={f.id} onClick={() => onMoveToFolder(f.id)}>
                <FolderIcon className="mr-2 h-3.5 w-3.5" />
                <span className="truncate">{f.name}</span>
              </DropdownMenuItem>
            ))}
            {chat.folderId && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onMoveToFolder(null)}>
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                  Remove from folder
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      <button
        onClick={(e) => {
          e.stopPropagation();
          api(`/api/chats/${chat.id}`, { method: "PATCH", body: JSON.stringify({ pinned: !chat.pinned }) }).then(() =>
            qc.invalidateQueries({ queryKey: ["chats"] })
          );
        }}
        className="opacity-0 transition-opacity group-hover:opacity-100"
        aria-label="Pin"
      >
        <Pin className={cn("h-3.5 w-3.5", chat.pinned ? "text-primary" : "text-muted-foreground")} />
      </button>
    </div>
  );
}

function MessageRow({
  message,
  streaming,
  copied,
  onCopy,
}: {
  message: { id: string; role: string; content: string; createdAt: string };
  streaming?: boolean;
  copied: boolean;
  onCopy: () => void;
}) {
  const isUser = message.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("group mb-6 flex gap-3", isUser ? "flex-row-reverse" : "flex-row")}
    >
      <Avatar className={cn("h-8 w-8 shrink-0", isUser ? "bg-primary/15" : "bg-gradient-to-br from-primary to-teal-500")}>
        <AvatarFallback className={isUser ? "text-primary" : "text-primary-foreground"}>
          {isUser ? "U" : <Sparkles className="h-4 w-4" />}
        </AvatarFallback>
      </Avatar>
      <div className={cn("min-w-0 max-w-[85%] flex-1", isUser && "flex flex-col items-end")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-3",
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-card border"
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap text-sm">{message.content}</p>
          ) : (
            <Markdown content={message.content} />
          )}
          {streaming && (
            <span className="ml-0.5 inline-block h-4 w-1.5 translate-y-0.5 animate-pulse bg-primary" />
          )}
        </div>
        {!isUser && !streaming && (
          <div className="mt-1.5 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground" onClick={onCopy}>
              {copied ? <Check className="mr-1 h-3 w-3" /> : <Copy className="mr-1 h-3 w-3" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function EmptyState({
  onPick,
  disabled,
  credits,
  agent,
  onClearAgent,
}: {
  onPick: (prompt: string) => void;
  disabled: boolean;
  credits: number;
  agent: { name: string; greeting: string } | null;
  onClearAgent: () => void;
}) {
  // Agent-specific suggestions
  const agentSuggestions = agent ? [
    { icon: "💡", title: `Ask ${agent.name}`, prompt: `Hi ${agent.name}, can you help me get started?` },
    { icon: "📋", title: "What can you do?", prompt: `What are your main capabilities and how can you help my business?` },
  ] : SUGGESTIONS;

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col items-center justify-center px-4 py-12 text-center">
      <div className="mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-primary to-teal-500 text-primary-foreground shadow-glow">
        <Sparkles className="h-8 w-8" />
      </div>
      <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
        {agent ? (
          <>
            Talking to <span className="text-gradient">{agent.name}</span>
          </>
        ) : (
          "How can I help you build today?"
        )}
      </h2>
      <p className="mt-2 max-w-md text-muted-foreground">
        {agent ? agent.greeting : "Ask anything — strategy, copy, code, analysis. NexusAI remembers context and helps you ship faster."}
      </p>
      {agent && (
        <Button variant="ghost" size="sm" onClick={onClearAgent} className="mt-3 text-xs text-muted-foreground">
          Clear agent
        </Button>
      )}
      <div className="mt-8 grid w-full gap-3 sm:grid-cols-2">
        {agentSuggestions.map((s) => (
          <button
            key={s.title}
            disabled={disabled}
            onClick={() => onPick(s.prompt)}
            className="group rounded-xl border bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md disabled:opacity-50"
          >
            <div className="mb-1.5 text-xl">{s.icon}</div>
            <p className="text-sm font-medium">{s.title}</p>
            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{s.prompt}</p>
          </button>
        ))}
      </div>
      <p className="mt-6 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <Zap className="h-3 w-3" /> {credits.toLocaleString()} credits available
      </p>
    </div>
  );
}
