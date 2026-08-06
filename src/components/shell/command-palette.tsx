"use client";

import { useEffect } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useWorkspace, type ModuleKey } from "@/store/workspace";
import {
  LayoutDashboard,
  MessageSquare,
  FileText,
  Image as ImageIcon,
  Bot,
  Search,
  Megaphone,
  Youtube,
  CreditCard,
  Sparkles,
  Rocket,
  Settings as SettingsIcon,
  Palette,
} from "lucide-react";

const ITEMS: { key: ModuleKey; label: string; hint: string; icon: typeof LayoutDashboard }[] = [
  { key: "dashboard", label: "Open Dashboard", hint: "Overview & metrics", icon: LayoutDashboard },
  { key: "chat", label: "New AI Chat", hint: "Start a conversation", icon: MessageSquare },
  { key: "documents", label: "AI Documents", hint: "Generate content", icon: FileText },
  { key: "images", label: "AI Images", hint: "Create visuals", icon: ImageIcon },
  { key: "agents", label: "AI Agents", hint: "Specialised assistants", icon: Bot },
  { key: "billing", label: "Plans & Credits", hint: "Upgrade / manage", icon: CreditCard },
  { key: "settings", label: "Settings", hint: "Account & brand voice", icon: SettingsIcon },
];

export function CommandPalette() {
  const { commandOpen, setCommandOpen, setActiveModule } = useWorkspace();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen(!commandOpen);
      }
      if (e.key === "Escape") setCommandOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [commandOpen, setCommandOpen]);

  const go = (key: ModuleKey) => {
    setActiveModule(key);
    setCommandOpen(false);
  };

  return (
    <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
      <CommandInput placeholder="Search actions, modules & agents…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigation">
          {ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <CommandItem key={item.key} value={`${item.label} ${item.hint}`} onSelect={() => go(item.key)}>
                <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
                <span className="flex-1">{item.label}</span>
                <span className="text-xs text-muted-foreground">{item.hint}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Coming soon">
          <CommandItem value="seo workspace audit research">
            <Search className="mr-2 h-4 w-4 text-muted-foreground" />
            <span className="flex-1">SEO Workspace</span>
            <span className="text-xs text-muted-foreground">Soon</span>
          </CommandItem>
          <CommandItem value="marketing campaigns ads funnels">
            <Megaphone className="mr-2 h-4 w-4 text-muted-foreground" />
            <span className="flex-1">Marketing Workspace</span>
            <span className="text-xs text-muted-foreground">Soon</span>
          </CommandItem>
          <CommandItem value="youtube titles scripts thumbnails">
            <Youtube className="mr-2 h-4 w-4 text-muted-foreground" />
            <span className="flex-1">YouTube Workspace</span>
            <span className="text-xs text-muted-foreground">Soon</span>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Quick actions">
          <CommandItem value="generate image business graphic" onSelect={() => go("images")}>
            <Sparkles className="mr-2 h-4 w-4 text-primary" />
            <span>Generate an image</span>
          </CommandItem>
          <CommandItem value="write business plan document" onSelect={() => go("documents")}>
            <Rocket className="mr-2 h-4 w-4 text-primary" />
            <span>Write a business plan</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
