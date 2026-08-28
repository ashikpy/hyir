'use client'

import { useState } from 'react'
import Link from 'next/link'
import { format, isPast, isToday } from 'date-fns'
import { ApplicationStatus } from '@prisma/client'
import { CompanyLogo } from '@/components/ui/avatars'
import { updateApplicationStatus } from '@/app/actions'
import { MapPin, DollarSign, Calendar, User, Clock, FileText } from 'lucide-react'

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

const PIPELINE_STAGES: { status: ApplicationStatus; label: string; countColor: string }[] = [
  { status: 'SAVED', label: 'Saved', countColor: 'text-zinc-400' },
  { status: 'APPLIED', label: 'Applied', countColor: 'text-blue-400' },
  { status: 'CONTACTED', label: 'Contacted', countColor: 'text-purple-400' },
  { status: 'SCREENING', label: 'Screening', countColor: 'text-amber-400' },
  { status: 'INTERVIEW', label: 'Interview', countColor: 'text-orange-400' },
  { status: 'ASSIGNMENT', label: 'Assignment', countColor: 'text-indigo-400' },
  { status: 'OFFER', label: 'Offer', countColor: 'text-emerald-400' },
  { status: 'REJECTED', label: 'Rejected', countColor: 'text-red-400' },
]

export function KanbanBoard({ initialApplications }: { initialApplications: KanbanApplication[] }) {
  const [applications, setApplications] = useState<KanbanApplication[]>(initialApplications)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [activeDropColumn, setActiveDropColumn] = useState<ApplicationStatus | null>(null)

  // Group applications by status
  const groupedApps: Record<ApplicationStatus, KanbanApplication[]> = {
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
    if (groupedApps[app.status]) {
      groupedApps[app.status].push(app)
    } else {
      groupedApps.SAVED.push(app)
    }
  })

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
    <div className="flex gap-5 overflow-x-auto pb-8 pt-2 flex-1 items-start select-none scrollbar-thin">
      {PIPELINE_STAGES.map((stage) => {
        const apps = groupedApps[stage.status] || []
        const isHovered = activeDropColumn === stage.status

        return (
          <div
            key={stage.status}
            onDragOver={(e) => handleDragOver(e, stage.status)}
            onDragEnter={(e) => handleDragOver(e, stage.status)}
            onDragLeave={(e) => handleDragLeave(e, stage.status)}
            onDrop={(e) => handleDrop(e, stage.status)}
            className={`flex flex-col w-[340px] shrink-0 rounded-2xl bg-zinc-950/40 border transition-all duration-150 p-3.5 min-h-[550px] ${
              isHovered
                ? 'border-blue-500/60 bg-blue-950/15 ring-2 ring-blue-500/20'
                : 'border-zinc-900/90 hover:border-zinc-800'
            }`}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between mb-3.5 px-2 py-1">
              <h3 className="text-xs uppercase tracking-wider font-semibold text-zinc-300">
                {stage.label}
              </h3>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 ${stage.countColor}`}>
                {apps.length}
              </span>
            </div>

            {/* Column Cards Container */}
            <div className="flex flex-col gap-3 flex-1 overflow-y-auto pr-1">
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
                          <span className="truncate max-w-[130px]">{app.location || app.workplaceType}</span>
                        </span>

                        {/* Salary / Pay Badge */}
                        {app.salary && (
                          <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <DollarSign className="w-3 h-3 text-emerald-400 shrink-0" />
                            <span className="truncate max-w-[120px]">{app.salary}</span>
                          </span>
                        )}
                      </div>

                      {/* Recruiter / Contact */}
                      {app.contactName && (
                        <div className="flex items-center gap-1.5 text-xs text-zinc-400 bg-zinc-950/60 border border-zinc-900 px-2.5 py-1.5 rounded-xl">
                          <User className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                          <span className="truncate">
                            <span className="font-medium text-zinc-200">{app.contactName}</span>
                            {app.contactRole && <span className="text-zinc-500"> · {app.contactRole}</span>}
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
                            ? `Applied ${format(new Date(app.dateApplied), 'MMM d, yyyy')}`
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
                            {isOverdue ? 'Overdue' : isDueToday ? 'Today' : format(followUpDue, 'MMM d')}
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
  )
}
