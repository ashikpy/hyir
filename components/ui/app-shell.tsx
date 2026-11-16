"use client";

import { usePathname } from "next/navigation";
import { Nav } from "@/components/ui/nav";
import { AddApplicationButton } from "@/components/ui/add-app-button";
import { UserMenu } from "@/components/ui/user-menu";
import { GlobalHotkeys } from "@/components/ui/global-hotkeys";
import { CommandPalette } from "@/components/ui/command-palette";
import { CopilotDrawer } from "@/components/ui/copilot-drawer";
import { CopilotTrigger } from "@/components/ui/copilot-trigger";
import { Plus } from "lucide-react";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === "/login" || pathname?.startsWith("/login");

  if (isAuthPage) {
    return <main className="flex-1 w-full min-h-screen">{children}</main>;
  }

  return (
    <div className="h-full bg-black text-zinc-50 flex w-full">
      {/* Left Sidebar */}
      <aside className="w-60 shrink-0 border-r border-white/[0.06] bg-zinc-950 px-3 py-5 flex flex-col h-full sticky top-0">
        <Nav />
        <div className="mt-auto space-y-2 pt-6">
          <AddApplicationButton className="group flex items-center gap-2 w-full h-9 px-2.5 rounded-lg bg-white text-zinc-950 text-[13px] font-medium shadow-[inset_0_-1px_0_rgb(0_0_0/0.1),0_1px_2px_rgb(0_0_0/0.5)] hover:bg-zinc-200 active:translate-y-px transition-all">
            <Plus className="w-4 h-4" strokeWidth={2.2} />
            <span>New application</span>
            <kbd className="ml-auto font-sans text-[10px] leading-none px-1.5 py-1 rounded-md bg-black/[0.06] text-zinc-500">
              N
            </kbd>
          </AddApplicationButton>

          <UserMenu />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-full overflow-y-auto">
        <div className="max-w-6xl w-full mx-auto p-12">{children}</div>
      </main>
      <GlobalHotkeys />
      <CommandPalette />
      <CopilotDrawer />
      <CopilotTrigger />
    </div>
  );
}
