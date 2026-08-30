'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { ArrowUpDown, Search, Sparkles } from 'lucide-react'
import { ImportExportModal } from './import-export-modal'
import { InboxSyncModal } from './inbox-sync-modal'
import { HyirLogo } from './hyr-logo'
import { getTriageCount } from '@/app/actions'

const items = [
  { name: 'Dashboard', href: '/' },
  { name: 'Applications', href: '/applications' },
  { name: 'Triage', href: '/triage', hasNotification: true },
  { name: 'Pipeline', href: '/pipeline' },
  { name: 'Follow-ups', href: '/follow-ups' },
  { name: 'Analytics', href: '/analytics' },
]

export function Nav() {
  const pathname = usePathname()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isInboxSyncOpen, setIsInboxSyncOpen] = useState(false)
  const [triageCount, setTriageCount] = useState<number | null>(null)

  useEffect(() => {
    let isMounted = true
    getTriageCount()
      .then((count) => {
        if (isMounted) setTriageCount(count)
      })
      .catch(() => {})

    return () => {
      isMounted = false
    }
  }, [pathname])

  function openSearch() {
    window.dispatchEvent(new CustomEvent('open-command-palette'))
  }

  return (
    <>
      <nav className="flex flex-col gap-1 w-48 shrink-0">
        <div className="mb-6 px-3 flex items-center gap-2.5">
          <HyirLogo className="w-5 h-5 text-white" />
          <h2 className="text-lg font-semibold tracking-tight text-white">
            Hyir
          </h2>
        </div>

        <button
          type="button"
          onClick={openSearch}
          className="flex items-center justify-between px-3 py-2 mb-4 text-xs font-medium rounded-lg text-zinc-400 bg-zinc-900/60 hover:bg-zinc-900 hover:text-zinc-200 border border-zinc-800 transition-colors text-left group cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300" />
            <span>Search...</span>
          </div>
          <kbd className="text-[10px] font-mono text-zinc-500 bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800/80">
            ⌘K
          </kbd>
        </button>
        {items.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href))
          const showTriageBadge = item.hasNotification && triageCount !== null && triageCount > 0

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'px-3 py-2 text-sm font-medium rounded-md transition-colors flex items-center justify-between',
                isActive
                  ? 'bg-zinc-900 text-zinc-50'
                  : 'text-zinc-400 hover:text-zinc-50 hover:bg-zinc-900/50'
              )}
            >
              <span>{item.name}</span>
              {showTriageBadge && (
                <span className="flex items-center justify-center min-w-[18px] h-4 px-1 rounded-full text-[10px] font-mono font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {triageCount}
                </span>
              )}
            </Link>
          )
        })}

        <div className="pt-4 mt-2 border-t border-zinc-900/80 space-y-1">
          <button
            type="button"
            onClick={() => setIsInboxSyncOpen(true)}
            className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md text-amber-400/90 hover:text-amber-300 hover:bg-amber-950/20 border border-transparent hover:border-amber-900/30 transition-all text-left cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
              <span>Sync Inbox</span>
            </div>
            <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300/80 border border-amber-500/20">
              AI
            </span>
          </button>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/50 transition-colors text-left cursor-pointer"
          >
            <ArrowUpDown className="w-4 h-4 text-zinc-500" />
            <span>Import / Export</span>
          </button>
        </div>
      </nav>

      {isInboxSyncOpen && (
        <InboxSyncModal
          isOpen={isInboxSyncOpen}
          onClose={() => setIsInboxSyncOpen(false)}
        />
      )}

      {isModalOpen && (
        <ImportExportModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  )
}
