"use client";

import { usePathname } from "next/navigation";
import { Nav } from "@/components/ui/nav";
import { AddApplicationButton } from "@/components/ui/add-app-button";
import { UserMenu } from "@/components/ui/user-menu";
import { GlobalHotkeys } from "@/components/ui/global-hotkeys";
import { CommandPalette } from "@/components/ui/command-palette";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === "/login" || pathname?.startsWith("/login");

  if (isAuthPage) {
    return <main className="flex-1 w-full min-h-screen">{children}</main>;
  }

  return (
    <div className="h-full bg-black text-zinc-50 flex w-full">
      {/* Left Sidebar */}
      <aside className="w-64 border-r border-zinc-900 bg-black p-6 flex flex-col h-full sticky top-0">
        <Nav />
        <div className="mt-auto space-y-3">
          <AddApplicationButton className="flex items-center justify-between w-full py-2 px-3 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-xs font-medium rounded-xl transition-all text-zinc-200 shadow-xs">
            <span className="flex items-center gap-1.5">
              <span className="text-sm font-light text-zinc-400">+</span>
              <span>Add Application</span>
            </span>
            <kbd className="text-[10px] font-mono text-zinc-400 bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800">
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
    </div>
  );
}
