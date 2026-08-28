'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { ArrowUpDown, Search } from 'lucide-react'
import { ImportExportModal } from './import-export-modal'
import { HyrLogo } from './hyr-logo'

const items = [
  { name: 'Dashboard', href: '/' },
  { name: 'Applications', href: '/applications' },
  { name: 'Pipeline', href: '/pipeline' },
  { name: 'Follow-ups', href: '/follow-ups' },
  { name: 'Analytics', href: '/analytics' },
]

export function Nav() {
  const pathname = usePathname()
  const [isModalOpen, setIsModalOpen] = useState(false)

  function openSearch() {
    window.dispatchEvent(new CustomEvent('open-command-palette'))
  }

  return (
    <>
      <nav className="flex flex-col gap-1 w-48 shrink-0">
        <div className="mb-6 px-3 flex items-center gap-2.5">
          <HyrLogo className="w-5 h-5 text-white" />
          <h2 className="text-lg font-semibold tracking-tight text-white">
            Hyr
          </h2>
        </div>

        <button
          type="button"
          onClick={openSearch}
          className="flex items-center justify-between px-3 py-2 mb-4 text-xs font-medium rounded-lg text-zinc-400 bg-zinc-900/60 hover:bg-zinc-900 hover:text-zinc-200 border border-zinc-800 transition-colors text-left group"
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
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'px-3 py-2 text-sm font-medium rounded-md transition-colors',
                isActive
                  ? 'bg-zinc-900 text-zinc-50'
                  : 'text-zinc-400 hover:text-zinc-50 hover:bg-zinc-900/50'
              )}
            >
              {item.name}
            </Link>
          )
        })}

        <div className="pt-4 mt-2 border-t border-zinc-900/80">
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/50 transition-colors text-left"
          >
            <ArrowUpDown className="w-4 h-4 text-zinc-500" />
            <span>Import / Export</span>
          </button>
        </div>
      </nav>

      {isModalOpen && (
        <ImportExportModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  )
}

