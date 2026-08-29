'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ApplicationStatus } from '@prisma/client'
import { updateApplicationStatus } from '@/app/actions'
import { ChevronDown, Check, Loader2 } from 'lucide-react'

interface StatusDropdownProps {
  applicationId: string
  initialStatus: ApplicationStatus
  className?: string
}

interface StatusItem {
  value: ApplicationStatus
  label: string
  badge: string
  dot: string
  hoverBg: string
}

export const STATUS_CONFIG: Record<ApplicationStatus, StatusItem> = {
  SAVED: {
    value: 'SAVED',
    label: 'Saved / Draft',
    badge: 'text-zinc-400 border-zinc-800 bg-zinc-900/90 hover:bg-zinc-800/90 hover:border-zinc-700',
    dot: 'bg-zinc-500 shadow-[0_0_8px_rgba(113,113,122,0.5)]',
    hoverBg: 'hover:bg-zinc-900',
  },
  APPLIED: {
    value: 'APPLIED',
    label: 'Applied',
    badge: 'text-blue-400 border-blue-500/30 bg-blue-950/40 hover:bg-blue-950/60 hover:border-blue-500/50',
    dot: 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.6)]',
    hoverBg: 'hover:bg-blue-950/30',
  },
  CONTACTED: {
    value: 'CONTACTED',
    label: 'Contacted',
    badge: 'text-purple-400 border-purple-500/30 bg-purple-950/40 hover:bg-purple-950/60 hover:border-purple-500/50',
    dot: 'bg-purple-400 shadow-[0_0_8px_rgba(192,132,252,0.6)]',
    hoverBg: 'hover:bg-purple-950/30',
  },
  SCREENING: {
    value: 'SCREENING',
    label: 'Screening',
    badge: 'text-amber-400 border-amber-500/30 bg-amber-950/40 hover:bg-amber-950/60 hover:border-amber-500/50',
    dot: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]',
    hoverBg: 'hover:bg-amber-950/30',
  },
  INTERVIEW: {
    value: 'INTERVIEW',
    label: 'Interview',
    badge: 'text-orange-400 border-orange-500/30 bg-orange-950/40 hover:bg-orange-950/60 hover:border-orange-500/50',
    dot: 'bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.6)]',
    hoverBg: 'hover:bg-orange-950/30',
  },
  ASSIGNMENT: {
    value: 'ASSIGNMENT',
    label: 'Assignment',
    badge: 'text-indigo-400 border-indigo-500/30 bg-indigo-950/40 hover:bg-indigo-950/60 hover:border-indigo-500/50',
    dot: 'bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.6)]',
    hoverBg: 'hover:bg-indigo-950/30',
  },
  OFFER: {
    value: 'OFFER',
    label: 'Offer',
    badge: 'text-emerald-400 border-emerald-500/30 bg-emerald-950/40 hover:bg-emerald-950/60 hover:border-emerald-500/50',
    dot: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]',
    hoverBg: 'hover:bg-emerald-950/30',
  },
  ACCEPTED: {
    value: 'ACCEPTED',
    label: 'Accepted',
    badge: 'text-emerald-400 border-emerald-500/30 bg-emerald-950/40 hover:bg-emerald-950/60 hover:border-emerald-500/50',
    dot: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]',
    hoverBg: 'hover:bg-emerald-950/30',
  },
  REJECTED: {
    value: 'REJECTED',
    label: 'Rejected',
    badge: 'text-rose-400 border-rose-500/30 bg-rose-950/40 hover:bg-rose-950/60 hover:border-rose-500/50',
    dot: 'bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.6)]',
    hoverBg: 'hover:bg-rose-950/30',
  },
  GHOSTED: {
    value: 'GHOSTED',
    label: 'Ghosted',
    badge: 'text-zinc-400 border-zinc-800 bg-zinc-900/90 hover:bg-zinc-800/90 hover:border-zinc-700',
    dot: 'bg-zinc-500 shadow-[0_0_8px_rgba(113,113,122,0.5)]',
    hoverBg: 'hover:bg-zinc-900',
  },
  WITHDRAWN: {
    value: 'WITHDRAWN',
    label: 'Withdrawn',
    badge: 'text-zinc-500 border-zinc-800 bg-zinc-900/90 hover:bg-zinc-800/90 hover:border-zinc-700',
    dot: 'bg-zinc-600 shadow-[0_0_8px_rgba(113,113,122,0.3)]',
    hoverBg: 'hover:bg-zinc-900',
  },
}

const ALL_STATUS_OPTIONS: ApplicationStatus[] = [
  'SAVED',
  'APPLIED',
  'CONTACTED',
  'SCREENING',
  'INTERVIEW',
  'ASSIGNMENT',
  'OFFER',
  'ACCEPTED',
  'REJECTED',
  'GHOSTED',
  'WITHDRAWN',
]

export function StatusDropdown({ applicationId, initialStatus, className = '' }: StatusDropdownProps) {
  const [currentStatus, setCurrentStatus] = useState<ApplicationStatus>(initialStatus)
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)

  // Keep local status in sync if initialStatus changes
  useEffect(() => {
    setCurrentStatus(initialStatus)
  }, [initialStatus])

  // Close dropdown on click outside or Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const handleSelectStatus = (newStatus: ApplicationStatus) => {
    if (newStatus === currentStatus) {
      setIsOpen(false)
      return
    }

    const previousStatus = currentStatus
    // Optimistic update
    setCurrentStatus(newStatus)
    setIsOpen(false)

    startTransition(async () => {
      try {
        await updateApplicationStatus(applicationId, newStatus)
        router.refresh()
      } catch (err) {
        console.error('Failed to update status:', err)
        setCurrentStatus(previousStatus)
        alert('Failed to update status. Please try again.')
      }
    })
  }

  const activeConfig = STATUS_CONFIG[currentStatus] || STATUS_CONFIG.SAVED

  return (
    <div className={`relative inline-block text-left ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isPending}
        title="Change application status"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`group inline-flex items-center justify-center gap-2 h-8 px-3 text-xs font-semibold uppercase tracking-wider border rounded-xl transition-all cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-zinc-700/50 ${activeConfig.badge} ${
          isPending ? 'opacity-70 cursor-wait' : ''
        }`}
      >
        {isPending ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <span className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${activeConfig.dot}`} />
        )}
        <span>{currentStatus.replace('_', ' ')}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          className="absolute left-0 sm:right-0 sm:left-auto mt-2 w-52 rounded-2xl bg-zinc-950/95 border border-zinc-800 shadow-2xl backdrop-blur-xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 origin-top"
        >
          <div className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 border-b border-zinc-900/80 mb-1">
            Change Stage
          </div>

          <div className="space-y-0.5 max-h-72 overflow-y-auto scrollbar-thin">
            {ALL_STATUS_OPTIONS.map((statusKey) => {
              const config = STATUS_CONFIG[statusKey]
              const isSelected = statusKey === currentStatus

              return (
                <button
                  key={statusKey}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelectStatus(statusKey)}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer group ${
                    isSelected
                      ? 'bg-zinc-900 text-zinc-100 font-semibold'
                      : `text-zinc-400 hover:text-zinc-200 ${config.hoverBg}`
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${config.dot}`} />
                    <span className="truncate">{config.label}</span>
                  </div>

                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-zinc-200 shrink-0 ml-2 animate-in zoom-in-50 duration-100" />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
