'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const items = [
  { name: 'Dashboard', href: '/' },
  { name: 'Applications', href: '/applications' },
  { name: 'Pipeline', href: '/pipeline' },
  { name: 'Follow-ups', href: '/follow-ups' },
  { name: 'Analytics', href: '/analytics' },
]

export function Nav() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-1 w-48 shrink-0">
      <div className="mb-8 px-3">
        <h2 className="text-lg font-semibold tracking-tight">JobHunt</h2>
      </div>
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
    </nav>
  )
}
