'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
import {
  Search,
  Building2,
  Briefcase,
  LayoutDashboard,
  Kanban,
  Clock,
  BarChart3,
  Plus,
  ArrowUpDown,
  ArrowRight,
  X,
  ExternalLink,
  Command
} from 'lucide-react'
import { getSearchApplications } from '@/app/actions'
import { CompanyLogo } from '@/components/ui/avatars'
import { ApplicationStatus } from '@prisma/client'

interface SearchItem {
  id: string
  slug: string
  companyName: string
  roleTitle: string
  status: ApplicationStatus
  location: string | null
  salary: string | null
  applicationUrl: string | null
  contactName: string | null
}

function StatusPill({ status }: { status: ApplicationStatus }) {
  const statusConfig: Record<ApplicationStatus, string> = {
    SAVED: 'text-zinc-400 border-zinc-800 bg-zinc-900',
    APPLIED: 'text-blue-400 border-blue-400/20 bg-blue-950/40',
    CONTACTED: 'text-purple-400 border-purple-400/20 bg-purple-950/40',
    SCREENING: 'text-amber-400 border-amber-400/20 bg-amber-950/40',
    INTERVIEW: 'text-orange-400 border-orange-400/20 bg-orange-950/40',
    ASSIGNMENT: 'text-indigo-400 border-indigo-400/20 bg-indigo-950/40',
    OFFER: 'text-emerald-400 border-emerald-400/20 bg-emerald-950/40',
    ACCEPTED: 'text-emerald-400 border-emerald-400/20 bg-emerald-950/40',
    REJECTED: 'text-red-400 border-red-400/20 bg-red-950/40',
    GHOSTED: 'text-zinc-500 border-zinc-800 bg-zinc-900',
    WITHDRAWN: 'text-zinc-500 border-zinc-800 bg-zinc-900',
  }

  const config = statusConfig[status] || statusConfig.SAVED

  return (
    <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 border rounded-full ${config}`}>
      {status.replace('_', ' ')}
    </span>
  )
}

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [applications, setApplications] = useState<SearchItem[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [mounted, setMounted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    setMounted(true)

    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle palette on Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setIsOpen((prev) => !prev)
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }

    const handleOpenEvent = () => setIsOpen(true)

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('open-command-palette', handleOpenEvent)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('open-command-palette', handleOpenEvent)
    }
  }, [isOpen])

  // Fetch applications whenever the palette opens
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true)
      getSearchApplications()
        .then((apps) => {
          setApplications(apps as SearchItem[])
        })
        .catch(console.error)
        .finally(() => setIsLoading(false))

      // Focus input on open
      setTimeout(() => {
        inputRef.current?.focus()
      }, 50)
    } else {
      setQuery('')
      setSelectedIndex(0)
    }
  }, [isOpen])

  // Static Navigation & Action items
  const navItems = useMemo(() => [
    {
      id: 'nav-dashboard',
      type: 'nav',
      title: 'Dashboard',
      subtitle: 'Overview & metrics',
      icon: LayoutDashboard,
      action: () => router.push('/'),
    },
    {
      id: 'nav-apps',
      type: 'nav',
      title: 'Job Applications',
      subtitle: 'Table view of all applications',
      icon: Briefcase,
      action: () => router.push('/applications'),
    },
    {
      id: 'nav-triage',
      type: 'nav',
      title: 'Triage & Incomplete',
      subtitle: 'Audit missing details and drafts',
      icon: Clock,
      action: () => router.push('/triage'),
    },
    {
      id: 'nav-pipeline',
      type: 'nav',
      title: 'Pipeline Kanban',
      subtitle: 'Visual drag-and-drop board',
      icon: Kanban,
      action: () => router.push('/pipeline'),
    },
    {
      id: 'nav-follow-ups',
      type: 'nav',
      title: 'Follow-ups',
      subtitle: 'Overdue & upcoming reminders',
      icon: Clock,
      action: () => router.push('/follow-ups'),
    },
    {
      id: 'nav-analytics',
      type: 'nav',
      title: 'Analytics',
      subtitle: 'Application conversion rates',
      icon: BarChart3,
      action: () => router.push('/analytics'),
    },
  ], [router])

  const actionItems = useMemo(() => [
    {
      id: 'act-new-app',
      type: 'action',
      title: 'New Application',
      subtitle: 'Track a new role or job lead',
      icon: Plus,
      badge: 'N',
      action: () => router.push('/applications/new'),
    },
  ], [router])

  // Filtered applications
  const filteredApps = useMemo(() => {
    if (!query.trim()) return applications.slice(0, 8)
    const q = query.toLowerCase().trim()
    return applications.filter((app) => {
      const matchCompany = app.companyName.toLowerCase().includes(q)
      const matchRole = app.roleTitle.toLowerCase().includes(q)
      const matchStatus = app.status.toLowerCase().includes(q)
      const matchLocation = app.location ? app.location.toLowerCase().includes(q) : false
      const matchContact = app.contactName ? app.contactName.toLowerCase().includes(q) : false
      return matchCompany || matchRole || matchStatus || matchLocation || matchContact
    })
  }, [applications, query])

  const filteredNav = useMemo(() => {
    if (!query.trim()) return navItems
    const q = query.toLowerCase().trim()
    return navItems.filter(
      (n) => n.title.toLowerCase().includes(q) || n.subtitle.toLowerCase().includes(q)
    )
  }, [navItems, query])

  const filteredActions = useMemo(() => {
    if (!query.trim()) return actionItems
    const q = query.toLowerCase().trim()
    return actionItems.filter(
      (a) => a.title.toLowerCase().includes(q) || a.subtitle.toLowerCase().includes(q)
    )
  }, [actionItems, query])

  // Combined flat list for keyboard arrow navigation
  const allResults = useMemo(() => {
    const list: Array<{
      id: string
      type: 'app' | 'nav' | 'action'
      data: any
    }> = []

    filteredApps.forEach((app) => list.push({ id: app.id, type: 'app', data: app }))
    filteredActions.forEach((act) => list.push({ id: act.id, type: 'action', data: act }))
    filteredNav.forEach((nav) => list.push({ id: nav.id, type: 'nav', data: nav }))

    return list
  }, [filteredApps, filteredActions, filteredNav])

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0)
  }, [query, allResults.length])

  // Keyboard navigation within the list
  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev + 1 < allResults.length ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : allResults.length - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (allResults[selectedIndex]) {
        executeItem(allResults[selectedIndex])
      }
    }
  }

  function executeItem(item: { id: string; type: string; data: any }) {
    setIsOpen(false)
    if (item.type === 'app') {
      router.push(`/applications/${item.data.slug}`)
    } else if (item.data.action) {
      item.data.action()
    }
  }

  if (!isOpen || !mounted) return null

  const content = (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-24 p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md animate-fade-in transition-opacity"
        onClick={() => setIsOpen(false)}
      />

      {/* Palette Box */}
      <div
        className="relative z-10 w-full max-w-xl bg-[#0c0c0e] border border-zinc-800 rounded-2xl shadow-2xl shadow-black overflow-hidden flex flex-col max-h-[70vh] animate-in fade-in zoom-in-95 duration-150"
        style={{ backgroundColor: '#0c0c0e' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-zinc-800/80 bg-[#0c0c0e] gap-3">
          <Search className="w-5 h-5 text-zinc-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Search companies, roles, status, location..."
            className="w-full bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none font-medium"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-zinc-500 hover:text-zinc-300 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono font-medium text-zinc-500 bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-2 space-y-4">
          {/* Applications Group */}
          {filteredApps.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-[10px] uppercase font-semibold tracking-wider text-zinc-500">
                Companies & Applications
              </div>
              <div className="space-y-0.5">
                {filteredApps.map((app) => {
                  const itemIndex = allResults.findIndex((r) => r.id === app.id)
                  const isSelected = itemIndex === selectedIndex

                  return (
                    <div
                      key={app.id}
                      onClick={() => executeItem({ id: app.id, type: 'app', data: app })}
                      onMouseEnter={() => setSelectedIndex(itemIndex)}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-zinc-800 text-white'
                          : 'text-zinc-300 hover:bg-zinc-900/60'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <CompanyLogo name={app.companyName} url={app.applicationUrl} className="w-6 h-6 rounded-md shrink-0" />
                        <div className="truncate">
                          <span className="font-semibold text-sm text-zinc-100 mr-2">
                            {app.companyName}
                          </span>
                          <span className="text-xs text-zinc-400">
                            {app.roleTitle}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0 ml-3">
                        {app.location && (
                          <span className="text-[11px] text-zinc-500 hidden sm:inline">
                            {app.location}
                          </span>
                        )}
                        <StatusPill status={app.status} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          {filteredActions.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-[10px] uppercase font-semibold tracking-wider text-zinc-500">
                Quick Actions
              </div>
              <div className="space-y-0.5">
                {filteredActions.map((act) => {
                  const itemIndex = allResults.findIndex((r) => r.id === act.id)
                  const isSelected = itemIndex === selectedIndex
                  const Icon = act.icon

                  return (
                    <div
                      key={act.id}
                      onClick={() => executeItem({ id: act.id, type: 'action', data: act })}
                      onMouseEnter={() => setSelectedIndex(itemIndex)}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-zinc-800 text-white'
                          : 'text-zinc-300 hover:bg-zinc-900/60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-zinc-100">{act.title}</div>
                          <div className="text-xs text-zinc-500">{act.subtitle}</div>
                        </div>
                      </div>
                      {act.badge && (
                        <kbd className="text-[10px] font-mono font-medium text-zinc-500 bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded">
                          {act.badge}
                        </kbd>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Navigation Items */}
          {filteredNav.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-[10px] uppercase font-semibold tracking-wider text-zinc-500">
                Navigation
              </div>
              <div className="space-y-0.5">
                {filteredNav.map((nav) => {
                  const itemIndex = allResults.findIndex((r) => r.id === nav.id)
                  const isSelected = itemIndex === selectedIndex
                  const Icon = nav.icon

                  return (
                    <div
                      key={nav.id}
                      onClick={() => executeItem({ id: nav.id, type: 'nav', data: nav })}
                      onMouseEnter={() => setSelectedIndex(itemIndex)}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-zinc-800 text-white'
                          : 'text-zinc-300 hover:bg-zinc-900/60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-zinc-100">{nav.title}</div>
                          <div className="text-xs text-zinc-500">{nav.subtitle}</div>
                        </div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-zinc-600" />
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {allResults.length === 0 && (
            <div className="py-12 text-center text-zinc-500 space-y-1">
              <p className="text-sm font-medium text-zinc-300">No matching applications found</p>
              <p className="text-xs text-zinc-600">Try searching for a different company or status</p>
            </div>
          )}
        </div>

        {/* Footer info bar */}
        <div className="px-4 py-2.5 border-t border-zinc-800/80 bg-zinc-950/60 flex items-center justify-between text-[11px] text-zinc-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px]">↑↓</kbd> navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px]">↵</kbd> open
            </span>
          </div>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px]">esc</kbd> close
          </span>
        </div>
      </div>
    </div>
  )

  return createPortal(content, document.body)
}
