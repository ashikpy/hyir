'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { format, isPast, isToday } from 'date-fns'
import { ApplicationStatus } from '@prisma/client'
import { CompanyLogo } from '@/components/ui/avatars'
import { updateApplicationStatus } from '@/app/actions'
import {
  MapPin,
  DollarSign,
  User,
  Clock,
  Zap,
  Layers,
  Archive,
  Search,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Inbox
} from 'lucide-react'

export interface KanbanApplication {
  id: string
  slug: string
  companyName: string
  roleTitle: string
  status: ApplicationStatus
  jobType?: string | null
  workplaceType: string
  location: string | null
  salary: string | null
  dateApplied: Date | string | null
  applicationUrl: string | null
  contactName: string | null
  contactRole: string | null
  notes: string | null
  updatedAt: Date | string
  nextFollowUpDate: Date | string | null
}

type ViewMode = 'ACTIVE' | 'ALL' | 'ARCHIVE'

interface StageConfig {
  status: ApplicationStatus
  label: string
  countColor: string
}

const ACTIVE_STAGES: StageConfig[] = [
  { status: 'CONTACTED', label: 'Contacted', countColor: 'text-purple-400' },
  { status: 'SCREENING', label: 'Screening', countColor: 'text-amber-400' },
  { status: 'INTERVIEW', label: 'Interview', countColor: 'text-orange-400' },
  { status: 'ASSIGNMENT', label: 'Assignment', countColor: 'text-indigo-400' },
  { status: 'OFFER', label: 'Offer', countColor: 'text-emerald-400' },
]

const ALL_STAGES: StageConfig[] = [
  { status: 'SAVED', label: 'Saved', countColor: 'text-zinc-400' },
  { status: 'APPLIED', label: 'Applied', countColor: 'text-blue-400' },
  { status: 'CONTACTED', label: 'Contacted', countColor: 'text-purple-400' },
  { status: 'SCREENING', label: 'Screening', countColor: 'text-amber-400' },
  { status: 'INTERVIEW', label: 'Interview', countColor: 'text-orange-400' },
  { status: 'ASSIGNMENT', label: 'Assignment', countColor: 'text-indigo-400' },
  { status: 'OFFER', label: 'Offer', countColor: 'text-emerald-400' },
  { status: 'REJECTED', label: 'Rejected', countColor: 'text-red-400' },
]

const ARCHIVE_STAGES: StageConfig[] = [
  { status: 'REJECTED', label: 'Rejected', countColor: 'text-red-400' },
  { status: 'GHOSTED', label: 'Ghosted', countColor: 'text-zinc-500' },
  { status: 'WITHDRAWN', label: 'Withdrawn', countColor: 'text-zinc-500' },
]

export function KanbanBoard({ initialApplications }: { initialApplications: KanbanApplication[] }) {
  const [applications, setApplications] = useState<KanbanApplication[]>(initialApplications)
  const [viewMode, setViewMode] = useState<ViewMode>('ACTIVE')
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [activeDropColumn, setActiveDropColumn] = useState<ApplicationStatus | null>(null)

  // Applied drawer state in ACTIVE mode
  const [isAppliedDrawerOpen, setIsAppliedDrawerOpen] = useState(true)
  const [appliedSearch, setAppliedSearch] = useState('')

  // Group applications by status
  const groupedApps = useMemo(() => {
    const map: Record<ApplicationStatus, KanbanApplication[]> = {
      SAVED: [],
      APPLIED: [],
      CONTACTED: [],
      SCREENING: [],
      INTERVIEW: [],
      ASSIGNMENT: [],
      OFFER: [],
      ACCEPTED: [],
      REJECTED: [],
      GHOSTED: [],
      WITHDRAWN: [],
    }

    applications.forEach((app) => {
      if (map[app.status]) {
        map[app.status].push(app)
      } else {
        map.SAVED.push(app)
      }
    })

    return map
  }, [applications])

  // Counts for pills
  const activeCount = useMemo(() => {
    return (
      groupedApps.CONTACTED.length +
      groupedApps.SCREENING.length +
      groupedApps.INTERVIEW.length +
      groupedApps.ASSIGNMENT.length +
      groupedApps.OFFER.length
    )
  }, [groupedApps])

  const appliedCount = groupedApps.APPLIED.length

  const currentStages = useMemo(() => {
    if (viewMode === 'ACTIVE') return ACTIVE_STAGES
    if (viewMode === 'ARCHIVE') return ARCHIVE_STAGES
    return ALL_STAGES
  }, [viewMode])

  // Filtered applied queue in drawer
  const filteredAppliedQueue = useMemo(() => {
    if (!appliedSearch.trim()) return groupedApps.APPLIED
    const q = appliedSearch.toLowerCase()
    return groupedApps.APPLIED.filter(
      (a) =>
        a.companyName.toLowerCase().includes(q) ||
        a.roleTitle.toLowerCase().includes(q) ||
        (a.location && a.location.toLowerCase().includes(q))
    )
  }, [groupedApps.APPLIED, appliedSearch])

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id)
    e.dataTransfer.setData('text/plain', id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragEnd = () => {
    setDraggedId(null)
    setActiveDropColumn(null)
  }

  const handleDragOver = (e: React.DragEvent, status: ApplicationStatus) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (activeDropColumn !== status) {
      setActiveDropColumn(status)
    }
  }

  const handleDragLeave = (e: React.DragEvent, status: ApplicationStatus) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return
    if (activeDropColumn === status) {
      setActiveDropColumn(null)
    }
  }

  const handleDrop = async (e: React.DragEvent, newStatus: ApplicationStatus) => {
    e.preventDefault()
    const id = e.dataTransfer.getData('text/plain') || draggedId
    setActiveDropColumn(null)
    setDraggedId(null)

    if (!id) return

    const targetApp = applications.find((a) => a.id === id)
    if (!targetApp || targetApp.status === newStatus) return

    // Optimistic UI update
    const prevApplications = [...applications]
    setApplications((prev) =>
      prev.map((app) => (app.id === id ? { ...app, status: newStatus, updatedAt: new Date() } : app))
    )

    try {
      await updateApplicationStatus(id, newStatus)
    } catch (err) {
      console.error('Failed to update status:', err)
      setApplications(prevApplications)
      alert('Failed to update application stage.')
    }
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 space-y-4">
      {/* Top View Mode Switcher Toolbar */}
      <div className="flex items-center justify-between gap-4 pb-2 border-b border-zinc-900 shrink-0">
        {/* Segmented Mode Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-zinc-950/80 border border-zinc-800/80 rounded-xl">
          <button
            type="button"
            onClick={() => setViewMode('ACTIVE')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              viewMode === 'ACTIVE'
                ? 'bg-zinc-100 text-black shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Active Pipeline</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                viewMode === 'ACTIVE' ? 'bg-black/10 text-black font-bold' : 'bg-zinc-900 text-zinc-400'
              }`}
            >
              {activeCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('ALL')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              viewMode === 'ALL'
                ? 'bg-zinc-100 text-black shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Full Funnel</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                viewMode === 'ALL' ? 'bg-black/10 text-black font-bold' : 'bg-zinc-900 text-zinc-400'
              }`}
            >
              {applications.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('ARCHIVE')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              viewMode === 'ARCHIVE'
                ? 'bg-zinc-100 text-black shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            <span>Archive</span>
          </button>
        </div>

        {/* In ACTIVE mode: Applied Queue toggle indicator / Drop Target */}
        {viewMode === 'ACTIVE' && (
          <button
            type="button"
            onClick={() => setIsAppliedDrawerOpen(!isAppliedDrawerOpen)}
            onDragOver={(e) => {
              e.preventDefault()
              if (!isAppliedDrawerOpen) setIsAppliedDrawerOpen(true)
              handleDragOver(e, 'APPLIED')
            }}
            onDragEnter={(e) => handleDragOver(e, 'APPLIED')}
            onDragLeave={(e) => handleDragLeave(e, 'APPLIED')}
            onDrop={(e) => handleDrop(e, 'APPLIED')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors cursor-pointer ${
              activeDropColumn === 'APPLIED'
                ? 'border-blue-500 bg-blue-950/40 text-blue-200 ring-2 ring-blue-500/40'
                : isAppliedDrawerOpen
                ? 'border-blue-500/40 bg-blue-950/20 text-blue-300'
                : 'border-zinc-800 bg-zinc-950/60 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Inbox className="w-3.5 h-3.5" />
            <span>Applied Queue ({appliedCount})</span>
            {isAppliedDrawerOpen ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>

      {/* Main Board Container */}
      <div className="flex gap-4 flex-1 min-h-0 items-start overflow-hidden">
        {/* ================= LEFT APPLIED QUEUE DRAWER (In ACTIVE mode) ================= */}
        {viewMode === 'ACTIVE' && isAppliedDrawerOpen && (
          <div
            onDragOver={(e) => handleDragOver(e, 'APPLIED')}
            onDragEnter={(e) => handleDragOver(e, 'APPLIED')}
            onDragLeave={(e) => handleDragLeave(e, 'APPLIED')}
            onDrop={(e) => handleDrop(e, 'APPLIED')}
            className={`w-[300px] shrink-0 rounded-2xl bg-zinc-950/60 border p-3 flex flex-col h-[calc(100vh-250px)] animate-in fade-in slide-in-from-left-4 duration-150 transition-all ${
              activeDropColumn === 'APPLIED'
                ? 'border-blue-500/60 bg-blue-950/20 ring-2 ring-blue-500/30'
                : 'border-zinc-900'
            }`}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between mb-2 px-1">
              <div className="flex items-center gap-2">
                <Inbox className="w-4 h-4 text-blue-400" />
                <h3 className="text-xs uppercase tracking-wider font-semibold text-zinc-300">
                  Applied Queue
                </h3>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-950/60 text-blue-300 border border-blue-800/40">
                {appliedCount}
              </span>
            </div>

            <p className="text-[11px] text-zinc-500 px-1 mb-3">
              Drag candidates into active stages as recruiters reply.
            </p>

            {/* In-drawer Search */}
            <div className="relative mb-3">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500" />
              <input
                type="text"
                value={appliedSearch}
                onChange={(e) => setAppliedSearch(e.target.value)}
                placeholder="Search applied queue..."
                className="w-full bg-[#0c0c0e] border border-zinc-800/80 rounded-xl py-1.5 pl-8 pr-3 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
              />
            </div>

            {/* Queue Cards Scroll area */}
            <div className="flex flex-col gap-2 overflow-y-auto pr-1 flex-1 scrollbar-thin">
              {filteredAppliedQueue.map((app) => {
                const isBeingDragged = draggedId === app.id

                return (
                  <div
                    key={app.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, app.id)}
                    onDragEnd={handleDragEnd}
                    className={`p-3 rounded-xl border bg-[#0c0c0e] transition-all cursor-grab active:cursor-grabbing hover:border-zinc-700 shadow-sm ${
                      isBeingDragged
                        ? 'opacity-40 border-dashed border-blue-500 scale-95'
                        : 'border-zinc-800/70 hover:bg-zinc-900/40'
                    }`}
                  >
                    <Link
                      href={`/applications/${app.slug}`}
                      className="block space-y-1.5"
                      onClick={(e) => {
                        if (isBeingDragged) e.preventDefault()
                      }}
                    >
                      <div className="flex items-center gap-2.5">
                        <CompanyLogo
                          name={app.companyName}
                          url={app.applicationUrl}
                          className="w-6 h-6 rounded-md shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <h4 className="font-semibold text-xs text-zinc-200 truncate">
                            {app.companyName}
                          </h4>
                          <p className="text-[11px] text-zinc-400 truncate">{app.roleTitle}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-1 border-t border-zinc-900">
                        <span className="truncate max-w-[140px]">{app.location || app.workplaceType}</span>
                        <span>
                          {app.dateApplied ? format(new Date(app.dateApplied), 'MMM d') : '—'}
                        </span>
                      </div>
                    </Link>
                  </div>
                )
              })}

              {filteredAppliedQueue.length === 0 && (
                <div className="p-6 text-center text-zinc-600 text-xs italic">
                  No applications in queue
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= COLUMNS (ACTIVE / ALL / ARCHIVE) ================= */}
        <div className="flex gap-4 overflow-x-auto pb-6 flex-1 items-start select-none scrollbar-thin h-[calc(100vh-250px)]">
          {currentStages.map((stage) => {
            const apps = groupedApps[stage.status] || []
            const isHovered = activeDropColumn === stage.status

            return (
              <div
                key={stage.status}
                onDragOver={(e) => handleDragOver(e, stage.status)}
                onDragEnter={(e) => handleDragOver(e, stage.status)}
                onDragLeave={(e) => handleDragLeave(e, stage.status)}
                onDrop={(e) => handleDrop(e, stage.status)}
                className={`flex flex-col w-[330px] shrink-0 rounded-2xl bg-zinc-950/40 border transition-all duration-150 p-3.5 h-full ${
                  isHovered
                    ? 'border-blue-500/60 bg-blue-950/15 ring-2 ring-blue-500/20'
                    : 'border-zinc-900/90 hover:border-zinc-800'
                }`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between mb-3 px-2 py-1 shrink-0">
                  <h3 className="text-xs uppercase tracking-wider font-semibold text-zinc-300">
                    {stage.label}
                  </h3>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 ${stage.countColor}`}
                  >
                    {apps.length}
                  </span>
                </div>

                {/* Column Cards Container */}
                <div className="flex flex-col gap-3 flex-1 overflow-y-auto pr-1 scrollbar-thin">
                  {apps.map((app) => {
                    const isBeingDragged = draggedId === app.id
                    const followUpDue = app.nextFollowUpDate ? new Date(app.nextFollowUpDate) : null
                    const isOverdue = followUpDue && isPast(followUpDue) && !isToday(followUpDue)
                    const isDueToday = followUpDue && isToday(followUpDue)

                    return (
                      <div
                        key={app.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, app.id)}
                        onDragEnd={handleDragEnd}
                        className={`group relative rounded-2xl border bg-[#0c0c0e] p-4 transition-all duration-150 cursor-grab active:cursor-grabbing hover:border-zinc-700 shadow-md ${
                          isBeingDragged
                            ? 'opacity-40 border-dashed border-blue-500 scale-95'
                            : 'border-zinc-800/80 hover:bg-zinc-900/30'
                        }`}
                      >
                        <Link
                          href={`/applications/${app.slug}`}
                          className="block space-y-3"
                          onClick={(e) => {
                            if (isBeingDragged) e.preventDefault()
                          }}
                        >
                          {/* Top Row: Logo, Company Name, Role */}
                          <div className="flex items-start gap-3">
                            <CompanyLogo
                              name={app.companyName}
                              url={app.applicationUrl}
                              className="w-9 h-9 rounded-xl shrink-0 mt-0.5"
                            />
                            <div className="min-w-0 flex-1">
                              <h4 className="font-semibold text-sm text-zinc-100 group-hover:text-white truncate">
                                {app.companyName}
                              </h4>
                              <p className="text-xs text-zinc-300 truncate font-normal mt-0.5">
                                {app.roleTitle}
                              </p>
                            </div>
                          </div>

                          {/* Badges / Attribute Chips */}
                          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                            {/* Job Type */}
                            {app.jobType && (
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 bg-zinc-900/80 border border-zinc-800 px-2 py-0.5 rounded-md">
                                {app.jobType.replace('_', ' ')}
                              </span>
                            )}

                            {/* Location */}
                            <span className="text-[11px] text-zinc-400 bg-zinc-900/80 border border-zinc-800 px-2 py-0.5 rounded-md flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-zinc-500 shrink-0" />
                              <span className="truncate max-w-[120px]">
                                {app.location || app.workplaceType}
                              </span>
                            </span>

                            {/* Salary / Pay Badge */}
                            {app.salary && (
                              <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-2 py-0.5 rounded-md flex items-center gap-1">
                                <DollarSign className="w-3 h-3 text-emerald-400 shrink-0" />
                                <span className="truncate max-w-[110px]">{app.salary}</span>
                              </span>
                            )}
                          </div>

                          {/* Recruiter / Contact */}
                          {app.contactName && (
                            <div className="flex items-center gap-1.5 text-xs text-zinc-400 bg-zinc-950/60 border border-zinc-900 px-2.5 py-1.5 rounded-xl">
                              <User className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                              <span className="truncate">
                                <span className="font-medium text-zinc-200">{app.contactName}</span>
                                {app.contactRole && (
                                  <span className="text-zinc-500"> · {app.contactRole}</span>
                                )}
                              </span>
                            </div>
                          )}

                          {/* Notes snippet */}
                          {app.notes && (
                            <p className="text-xs text-zinc-500 italic line-clamp-2 leading-relaxed bg-zinc-950/40 border border-zinc-900/80 p-2 rounded-xl">
                              &ldquo;{app.notes}&rdquo;
                            </p>
                          )}

                          {/* Footer: Date Applied / Follow-up Status */}
                          <div className="flex items-center justify-between pt-2 border-t border-zinc-900 text-[10px] text-zinc-500">
                            <span>
                              {app.dateApplied
                                ? `Applied ${format(new Date(app.dateApplied), 'MMM d')}`
                                : `Updated ${format(new Date(app.updatedAt), 'MMM d')}`}
                            </span>

                            {followUpDue && (
                              <span
                                className={`px-2 py-0.5 rounded-md font-medium text-[10px] uppercase tracking-wider flex items-center gap-1 ${
                                  isOverdue
                                    ? 'bg-red-950/60 text-red-400 border border-red-900/50'
                                    : isDueToday
                                    ? 'bg-amber-950/60 text-amber-400 border border-amber-900/50'
                                    : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                                }`}
                              >
                                <Clock className="w-3 h-3" />
                                {isOverdue
                                  ? 'Overdue'
                                  : isDueToday
                                  ? 'Today'
                                  : format(followUpDue, 'MMM d')}
                              </span>
                            )}
                          </div>
                        </Link>
                      </div>
                    )
                  })}

                  {apps.length === 0 && (
                    <div className="flex-1 border border-dashed border-zinc-900 rounded-2xl p-6 flex items-center justify-center text-center">
                      <span className="text-xs text-zinc-600 font-medium">Drag applications here</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
