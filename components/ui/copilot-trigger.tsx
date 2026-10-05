'use client'

import { Sparkles } from 'lucide-react'

export function CopilotTrigger() {
  const handleClick = () => {
    window.dispatchEvent(new CustomEvent('toggle-copilot'))
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Open Hyir Copilot"
      className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-3.5 py-2.5 bg-zinc-950/90 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700/80 text-zinc-200 hover:text-white rounded-full shadow-2xl backdrop-blur-md transition-all duration-200 hover:scale-105 active:scale-95 group cursor-pointer"
    >
      <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-amber-500/30 to-purple-500/30 border border-amber-500/40 flex items-center justify-center text-amber-300 group-hover:rotate-12 transition-transform">
        <Sparkles className="w-3 h-3 text-amber-300" />
      </div>
      <span className="text-xs font-semibold tracking-tight">Copilot</span>
      <kbd className="text-[10px] font-mono text-zinc-400 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800 group-hover:border-zinc-700">
        ⌘J
      </kbd>
    </button>
  )
}
