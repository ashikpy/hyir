'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'motion/react'
import { cn } from '@/lib/utils'
import {
  ArrowUpDown,
  BriefcaseBusiness,
  CalendarClock,
  ChartNoAxesColumn,
  Columns3,
  Inbox,
  LayoutGrid,
  MailSearch,
  Search,
  type LucideIcon,
} from 'lucide-react'
import { ImportExportModal } from './import-export-modal'
import { InboxSyncModal } from './inbox-sync-modal'
import { HyirLogo, HyirAiLogo } from './hyr-logo'
import { getTriageCount } from '@/app/actions'

type NavItem = {
  name: string
  href: string
  icon: LucideIcon
  hasNotification?: boolean
}

const items: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: LayoutGrid },
  { name: 'Applications', href: '/applications', icon: BriefcaseBusiness },
  { name: 'Triage', href: '/triage', icon: Inbox, hasNotification: true },
  { name: 'Pipeline', href: '/pipeline', icon: Columns3 },
  { name: 'Follow-ups', href: '/follow-ups', icon: CalendarClock },
  { name: 'Analytics', href: '/analytics', icon: ChartNoAxesColumn },
]

function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        'font-sans text-[10px] leading-none text-zinc-500 px-1.5 py-1 rounded-md bg-white/[0.04] border border-white/[0.06]',
        className
      )}
    >
      {children}
    </kbd>
  )
}

const rowBase =
  'group relative flex items-center gap-2.5 h-8 px-2.5 rounded-lg text-[13px] transition-colors cursor-pointer'

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
      <nav className="flex flex-col w-full">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 px-2 h-9 mb-5 rounded-lg">
          <span className="grid place-items-center w-7 h-7 rounded-lg bg-white shadow-[0_0_0_1px_rgb(255_255_255/0.1),0_4px_12px_-2px_rgb(255_255_255/0.15)]">
            <HyirLogo className="w-4 h-4 text-black" />
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-white">Hyir</span>
        </Link>

        {/* Search */}
        <button
          type="button"
          onClick={openSearch}
          className="group flex items-center gap-2.5 h-9 px-2.5 mb-6 rounded-lg text-[13px] text-zinc-500 bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] hover:text-zinc-300 transition-colors cursor-pointer"
        >
          <Search className="w-4 h-4" />
          <span>Search</span>
          <Kbd className="ml-auto">⌘K</Kbd>
        </button>

        {/* Primary */}
        <div className="flex flex-col gap-0.5">
          {items.map((item) => {
            const isActive =
              pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href))
            const showTriageBadge =
              item.hasNotification && triageCount !== null && triageCount > 0
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  rowBase,
                  isActive ? 'text-white' : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.03]'
                )}
              >
                {isActive && (
                  <motion.span
                    layoutId="nav-active"
                    transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                    className="absolute inset-0 rounded-lg bg-white/[0.07] shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]"
                  >
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-[11px] h-4 w-[3px] rounded-r-full bg-white" />
                  </motion.span>
                )}
                <Icon
                  className={cn(
                    'relative w-4 h-4 shrink-0 transition-colors',
                    isActive ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'
                  )}
                  strokeWidth={isActive ? 2.2 : 1.8}
                />
                <span className="relative">{item.name}</span>
                {showTriageBadge && (
                  <span className="relative ml-auto flex items-center gap-1.5 text-[11px] tabular-nums text-amber-300/90">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgb(251_191_36/0.8)]" />
                    {triageCount}
                  </span>
                )}
              </Link>
            )
          })}
        </div>

        {/* Tools */}
        <p className="px-2.5 mt-7 mb-2 text-[11px] font-medium text-zinc-600">Tools</p>
        <div className="flex flex-col gap-0.5">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('toggle-copilot'))}
            className={cn(rowBase, 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.03] text-left')}
          >
            <HyirAiLogo className="w-4 h-4 shrink-0" />
            <span>Copilot</span>
            <Kbd className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">⌘J</Kbd>
          </button>

          <button
            type="button"
            onClick={() => setIsInboxSyncOpen(true)}
            className={cn(rowBase, 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.03] text-left')}
          >
            <MailSearch className="w-4 h-4 shrink-0 text-zinc-500 group-hover:text-zinc-300" strokeWidth={1.8} />
            <span>Sync inbox</span>
          </button>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className={cn(rowBase, 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.03] text-left')}
          >
            <ArrowUpDown className="w-4 h-4 shrink-0 text-zinc-500 group-hover:text-zinc-300" strokeWidth={1.8} />
            <span>Import / export</span>
          </button>
        </div>
      </nav>

      {isInboxSyncOpen && (
        <InboxSyncModal isOpen={isInboxSyncOpen} onClose={() => setIsInboxSyncOpen(false)} />
      )}

      {isModalOpen && (
        <ImportExportModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      )}
    </>
  )
}
