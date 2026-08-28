'use client'

import { useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ApplicationStatus } from '@prisma/client'
import { CompanyLogo } from '@/components/ui/avatars'
import { updateApplicationStatus } from '@/app/actions'
import { MapPin, DollarSign, Calendar, GripVertical } from 'lucide-react'

export interface KanbanApplication {
  id: string
  slug: string
  companyName: string
  roleTitle: string
  status: ApplicationStatus
  location: string | null
  workplaceType: string
  salary: string | null
  applicationUrl: string | null
  updatedAt: Date | string
  nextFollowUpDate: Date | string | null
}

const PIPELINE_STAGES: { status: ApplicationStatus; label: string; color: string }[] = [
  { status: 'SAVED', label: 'Saved', color: 'border-zinc-800' },
  { status: 'APPLIED', label: 'Applied', color: 'border-blue-500/30' },
  { status: 'CONTACTED', label: 'Contacted', color: 'border-purple-500/30' },
  { status: 'SCREENING', label: 'Screening', color: 'border-amber-500/30' },
  { status: 'INTERVIEW', label: 'Interview', color: 'border-orange-500/30' },
  { status: 'ASSIGNMENT', label: 'Assignment', color: 'border-indigo-500/30' },
  { status: 'OFFER', label: 'Offer', color: 'border-emerald-500/30' },
  { status: 'REJECTED', label: 'Rejected', color: 'border-red-500/30' },
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
    // Only clear if leaving the column element itself
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
      // Revert on error
      setApplications(prevApplications)
      alert('Failed to update application stage.')
    }
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-8 pt-2 flex-1 items-start select-none scrollbar-thin">
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
            className={`flex flex-col w-[290px] shrink-0 rounded-2xl bg-zinc-950/40 border transition-all duration-150 p-3 min-h-[500px] ${
              isHovered
                ? 'border-blue-500/60 bg-blue-950/10 ring-2 ring-blue-500/20'
                : 'border-zinc-900/80 hover:border-zinc-800'
            }`}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between mb-3 px-2 py-1">
              <h3 className="text-xs uppercase tracking-wider font-semibold text-zinc-400">
                {stage.label}
              </h3>
              <span className="text-xs font-semibold text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-full">
                {apps.length}
              </span>
            </div>

            {/* Column Cards */}
            <div className="flex flex-col gap-2.5 flex-1 overflow-y-auto pr-1">
              {apps.map((app) => {
                const isBeingDragged = draggedId === app.id

                return (
                  <div
                    key={app.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, app.id)}
                    onDragEnd={handleDragEnd}
                    className={`group relative rounded-xl border bg-[#0c0c0e] p-3.5 transition-all duration-150 cursor-grab active:cursor-grabbing hover:border-zinc-700 shadow-sm ${
                      isBeingDragged
                        ? 'opacity-40 border-dashed border-blue-500 scale-95'
                        : 'border-zinc-800/80 hover:bg-zinc-900/40'
                    }`}
                  >
                    <Link
                      href={`/applications/${app.slug}`}
                      className="block space-y-2.5"
                      onClick={(e) => {
                        // Prevent navigation if user was just dragging
                        if (isBeingDragged) e.preventDefault()
                      }}
                    >
                      {/* Top row: Logo, Name, Role */}
                      <div className="flex items-start gap-2.5">
                        <CompanyLogo
                          name={app.companyName}
                          url={app.applicationUrl}
                          className="w-7 h-7 rounded-lg shrink-0 mt-0.5"
                        />
                        <div className="min-w-0 flex-1">
                          <h4 className="font-semibold text-sm text-zinc-100 group-hover:text-white truncate">
                            {app.companyName}
                          </h4>
                          <p className="text-xs text-zinc-400 truncate">{app.roleTitle}</p>
                        </div>
                      </div>

                      {/* Middle metadata: Location / Workplace */}
                      <div className="flex items-center gap-2 text-[11px] text-zinc-500 pt-1">
                        <span className="truncate">
                          {app.location || app.workplaceType}
                        </span>
                        {app.salary && (
                          <>
                            <span>·</span>
                            <span className="text-zinc-400 font-medium truncate">{app.salary}</span>
                          </>
                        )}
                      </div>

                      {/* Footer row: Follow-up or updated date */}
                      <div className="flex items-center justify-between pt-1 border-t border-zinc-900/80 text-[10px] text-zinc-500">
                        <span>Updated {format(new Date(app.updatedAt), 'MMM d')}</span>
                        {app.nextFollowUpDate && (
                          <span
                            className={`px-1.5 py-0.5 rounded font-mono font-medium ${
                              new Date(app.nextFollowUpDate) < new Date()
                                ? 'bg-red-950/60 text-red-400 border border-red-900/50'
                                : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                            }`}
                          >
                            Follow-up: {format(new Date(app.nextFollowUpDate), 'MMM d')}
                          </span>
                        )}
                      </div>
                    </Link>
                  </div>
                )
              })}

              {apps.length === 0 && (
                <div className="flex-1 border border-dashed border-zinc-900 rounded-xl p-6 flex items-center justify-center text-center">
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
