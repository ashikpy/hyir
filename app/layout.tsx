import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/ui/nav";
import { AddApplicationButton } from "@/components/ui/add-app-button";
import { GlobalHotkeys } from "@/components/ui/global-hotkeys";
import { CommandPalette } from "@/components/ui/command-palette";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hyir · Job Application Command Center",
  description: "Personal job application tracking and pipeline command center",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="h-full bg-black text-zinc-50 flex">
        {/* Left Sidebar */}
        <aside className="w-64 border-r border-zinc-900 bg-black p-6 flex flex-col h-full sticky top-0">
          <Nav />
          <div className="mt-auto">
            <AddApplicationButton className="flex items-center justify-between w-full py-2 px-3 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-xs font-medium rounded-xl transition-all text-zinc-200 shadow-xs">
              <span className="flex items-center gap-1.5">
                <span className="text-sm font-light text-zinc-400">+</span>
                <span>Add Application</span>
              </span>
              <kbd className="text-[10px] font-mono text-zinc-400 bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800">
                N
              </kbd>
            </AddApplicationButton>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-h-full overflow-y-auto">
          <div className="max-w-6xl w-full mx-auto p-12">{children}</div>
        </main>
        <GlobalHotkeys />
        <CommandPalette />
      </body>
    </html>
  );
}
