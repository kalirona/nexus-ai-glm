"use client";

import { LayoutDashboard, MessageSquare, FileText, Image as ImageIcon, Bot } from "lucide-react";
import { useWorkspace, type ModuleKey } from "@/store/workspace";
import { cn } from "@/lib/utils";

const ITEMS: { key: ModuleKey; icon: typeof LayoutDashboard; label: string }[] = [
  { key: "dashboard", icon: LayoutDashboard, label: "Home" },
  { key: "chat", icon: MessageSquare, label: "Chat" },
  { key: "documents", icon: FileText, label: "Docs" },
  { key: "images", icon: ImageIcon, label: "Images" },
  { key: "agents", icon: Bot, label: "Agents" },
];

export function MobileNav() {
  const { activeModule, setActiveModule } = useWorkspace();
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t bg-background/90 glass">
      <div className="flex items-stretch justify-around px-2 py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const active = activeModule === item.key;
          return (
            <button
              key={item.key}
              onClick={() => setActiveModule(item.key)}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 rounded-lg py-1.5 text-[11px] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5", active && "scale-110")} />
              {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
