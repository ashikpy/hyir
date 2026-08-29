'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format, isPast, isToday } from 'date-fns'
import { ApplicationStatus } from '@prisma/client'
import { CompanyLogo } from '@/components/ui/avatars'
import { quickUpdateTriageField, batchTransitionToGhosted, snoozeStaleApplication } from '@/app/actions'
import {
  AlertCircle,
  CheckCircle2,
  Search,
  Check,
  X,
  ArrowRight,
  ExternalLink,
  Link as LinkIcon,
  DollarSign,
  User,
  Mail,
  FileText,
  Calendar,
  Ghost
} from 'lucide-react'

export interface TriageApp {
  id: string
  slug: string
  companyName: string
  roleTitle: string
  status: ApplicationStatus
  jobType: string
  workplaceType: string
  location: string | null
  salary: string | null
  applicationUrl: string | null
  contactName: string | null
  contactEmail: string | null
  contactRole: string | null
  notes: string | null
  resumeVersion: string | null
  portfolioVersion: string | null
  dateApplied: Date | string | null
  nextFollowUpDate: Date | string | null
  updatedAt: Date | string
  timelineEvents?: Array<{ date: Date | string; eventType: string }>
}

export type TriageFilter = 'ALL' | 'DRAFTS' | 'NO_URL' | 'NO_DATE' | 'NO_CONTACT' | 'NO_SALARY' | 'STALE'

const STATUS_OPTIONS = [
  {
    value: 'APPLIED',
    label: 'Applied',
    activeClass: 'bg-blue-500/15 text-blue-300 border-blue-500/60 ring-1 ring-blue-500/30',
    idleClass: 'bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:border-blue-500/40 hover:text-blue-300',
    dotColor: 'bg-blue-400',
    checkColor: 'text-blue-400',
  },
  {
    value: 'CONTACTED',
    label: 'Contacted',
    activeClass: 'bg-purple-500/15 text-purple-300 border-purple-500/60 ring-1 ring-purple-500/30',
    idleClass: 'bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:border-purple-500/40 hover:text-purple-300',
    dotColor: 'bg-purple-400',
    checkColor: 'text-purple-400',
  },
  {
    value: 'INTERVIEW',
    label: 'Interview',
    activeClass: 'bg-orange-500/15 text-orange-300 border-orange-500/60 ring-1 ring-orange-500/30',
    idleClass: 'bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:border-orange-500/40 hover:text-orange-300',
    dotColor: 'bg-orange-400',
    checkColor: 'text-orange-400',
  },
  {
    value: 'OFFER',
    label: 'Offer',
    activeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/60 ring-1 ring-emerald-500/30',
    idleClass: 'bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:border-emerald-500/40 hover:text-emerald-300',
    dotColor: 'bg-emerald-400',
    checkColor: 'text-emerald-400',
  },
  {
    value: 'REJECTED',
    label: 'Rejected',
    activeClass: 'bg-rose-500/15 text-rose-300 border-rose-500/60 ring-1 ring-rose-500/30',
    idleClass: 'bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:border-rose-500/40 hover:text-rose-300',
    dotColor: 'bg-rose-400',
    checkColor: 'text-rose-400',
  },
  {
    value: 'GHOSTED',
    label: 'Ghosted',
    activeClass: 'bg-zinc-800 text-zinc-200 border-zinc-600 ring-1 ring-zinc-500/30',
    idleClass: 'bg-zinc-900/60 text-zinc-500 border-zinc-800 hover:border-zinc-700 hover:text-zinc-300',
    dotColor: 'bg-zinc-500',
    checkColor: 'text-zinc-400',
  },
]

function StatusBadge({ status }: { status: ApplicationStatus }) {
  const statusConfig: Record<ApplicationStatus, string> = {
    SAVED: 'text-zinc-400 border-zinc-800 bg-zinc-900',
    APPLIED: 'text-blue-400 border-blue-500/20 bg-blue-950/40',
    CONTACTED: 'text-purple-400 border-purple-500/20 bg-purple-950/40',
    SCREENING: 'text-amber-400 border-amber-500/20 bg-amber-950/40',
    INTERVIEW: 'text-orange-400 border-orange-500/20 bg-orange-950/40',
    ASSIGNMENT: 'text-indigo-400 border-indigo-500/20 bg-indigo-950/40',
    OFFER: 'text-emerald-400 border-emerald-500/20 bg-emerald-950/40',
    ACCEPTED: 'text-emerald-400 border-emerald-500/20 bg-emerald-950/40',
    REJECTED: 'text-rose-400 border-rose-500/20 bg-rose-950/40',
    GHOSTED: 'text-zinc-400 border-zinc-800 bg-zinc-900',
    WITHDRAWN: 'text-zinc-500 border-zinc-800 bg-zinc-900',
  }

  const config = statusConfig[status] || statusConfig.SAVED

  return (
    <span className={`text-[10px] uppercase tracking-wider font-semibold px-2.5 py-0.5 border rounded-full ${config}`}>
      {status.replace('_', ' ')}
    </span>
  )
}

interface IssueTag {
  label: string
  tier: 'blocker' | 'warning' | 'info'
  key: string
}

export function isAppStale(app: TriageApp): { isStale: boolean; daysInactive: number; threshold: number } {
  if (!['APPLIED', 'CONTACTED', 'SCREENING'].includes(app.status)) {
    return { isStale: false, daysInactive: 0, threshold: 0 }
  }

  // If there is an upcoming scheduled follow-up, it is not stale
  if (app.nextFollowUpDate && new Date(app.nextFollowUpDate).getTime() > Date.now()) {
    return { isStale: false, daysInactive: 0, threshold: 0 }
  }

  // Production thresholds: 25 days for Applied, 14 days for Contacted/Screening
  const threshold = app.status === 'APPLIED' ? 25 : 14

  const dates: number[] = []
  if (app.dateApplied) dates.push(new Date(app.dateApplied).getTime())
  if (app.timelineEvents && app.timelineEvents.length > 0) {
    dates.push(new Date(app.timelineEvents[0].date).getTime())
  }

  const latestActivity = dates.length > 0 ? Math.max(...dates) : 0
  if (!latestActivity) {
    return { isStale: false, daysInactive: 0, threshold }
  }

  const daysInactive = Math.max(0, Math.floor((Date.now() - latestActivity) / (1000 * 60 * 60 * 24)))

  return {
    isStale: daysInactive >= threshold,
    daysInactive,
    threshold,
  }
}

function getAppIssues(app: TriageApp): IssueTag[] {
  const tags: IssueTag[] = []

  if (app.status === 'SAVED') {
    tags.push({ label: 'Draft', tier: 'blocker', key: 'draft' })
  }
  if (!app.applicationUrl) {
    tags.push({ label: 'No Link', tier: 'blocker', key: 'no_url' })
  }
  if (!app.dateApplied && app.status !== 'SAVED') {
    tags.push({ label: 'No Applied Date', tier: 'blocker', key: 'no_date' })
  }
  if (app.nextFollowUpDate) {
    const due = new Date(app.nextFollowUpDate)
    if (isPast(due) && !isToday(due) && app.status !== 'REJECTED' && app.status !== 'GHOSTED') {
      tags.push({ label: 'Overdue Follow-up', tier: 'blocker', key: 'overdue' })
    }
  }
  if (!app.contactName && app.status !== 'SAVED') {
    tags.push({ label: 'No Contact', tier: 'warning', key: 'no_contact' })
  }
  if (!app.salary || app.salary.trim() === '') {
    tags.push({ label: 'No Salary', tier: 'warning', key: 'no_salary' })
  }
  if (app.status === 'INTERVIEW' && !app.nextFollowUpDate) {
    tags.push({ label: 'No Interview Date', tier: 'warning', key: 'no_interview_date' })
  }
  
  const staleInfo = isAppStale(app)
  if (staleInfo.isStale) {
    tags.push({ label: `Stale (${staleInfo.daysInactive}d)`, tier: 'warning', key: 'stale' })
  }

  return tags
}

export function TriageView({ applications }: { applications: TriageApp[] }) {
  const router = useRouter()
  const [filter, setFilter] = useState<TriageFilter>('ALL')
  const [search, setSearch] = useState('')
  const [activeAppId, setActiveAppId] = useState<string | null>(null)

  // Local state for fast drawer edits
  const [formUrl, setFormUrl] = useState('')
  const [formDateApplied, setFormDateApplied] = useState('')
  const [formSalary, setFormSalary] = useState('')
  const [formContactName, setFormContactName] = useState('')
  const [formContactEmail, setFormContactEmail] = useState('')
  const [formStatus, setFormStatus] = useState<ApplicationStatus>('APPLIED')
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [isBannerDismissed, setIsBannerDismissed] = useState(false)
  const [isBatchGhosting, setIsBatchGhosting] = useState(false)

  // Stale applications for quick review
  const staleApps = useMemo(() => {
    return applications.filter((app) => isAppStale(app).isStale)
  }, [applications])

  // Filter applications that have any issues
  const triageItems = useMemo(() => {
    return applications
      .map((app) => ({
        app,
        issues: getAppIssues(app),
      }))
      .filter((item) => item.issues.length > 0)
  }, [applications])

  // Counts
  const counts = useMemo(() => {
    let drafts = 0
    let noUrl = 0
    let noDate = 0
    let noContact = 0
    let noSalary = 0
    let stale = 0

    triageItems.forEach(({ issues }) => {
      if (issues.some((i) => i.key === 'draft')) drafts++
      if (issues.some((i) => i.key === 'no_url')) noUrl++
      if (issues.some((i) => i.key === 'no_date')) noDate++
      if (issues.some((i) => i.key === 'no_contact')) noContact++
      if (issues.some((i) => i.key === 'no_salary')) noSalary++
      if (issues.some((i) => i.key === 'stale')) stale++
    })

    return { drafts, noUrl, noDate, noContact, noSalary, stale }
  }, [triageItems])

  // Filtered by active tab & search
  const filteredApps = useMemo(() => {
    return triageItems.filter(({ app, issues }) => {
      const matchSearch =
        search === '' ||
        app.companyName.toLowerCase().includes(search.toLowerCase()) ||
        app.roleTitle.toLowerCase().includes(search.toLowerCase())

      if (!matchSearch) return false

      if (filter === 'DRAFTS') return issues.some((i) => i.key === 'draft')
      if (filter === 'NO_URL') return issues.some((i) => i.key === 'no_url')
      if (filter === 'NO_DATE') return issues.some((i) => i.key === 'no_date')
      if (filter === 'NO_CONTACT') return issues.some((i) => i.key === 'no_contact')
      if (filter === 'NO_SALARY') return issues.some((i) => i.key === 'no_salary')
      if (filter === 'STALE') return issues.some((i) => i.key === 'stale')

      return true
    })
  }, [triageItems, filter, search])

  // Active App for Inspector
  const activeApp = useMemo(() => {
    return applications.find((a) => a.id === activeAppId) || null
  }, [applications, activeAppId])

  // Populate drawer form when active app changes
  useEffect(() => {
    if (activeApp) {
      setFormUrl(activeApp.applicationUrl || '')
      setFormDateApplied(
        activeApp.dateApplied
          ? new Date(activeApp.dateApplied).toISOString().split('T')[0]
          : ''
      )
      setFormSalary(activeApp.salary || '')
      setFormContactName(activeApp.contactName || '')
      setFormContactEmail(activeApp.contactEmail || '')
      setFormStatus(activeApp.status)
      setSaveSuccess(false)
    }
  }, [activeApp])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeAppId) {
        setActiveAppId(null)
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && activeAppId) {
        e.preventDefault()
        handleSaveDrawer(true) // Save and go to next
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeAppId, formUrl, formDateApplied, formSalary, formContactName, formContactEmail, formStatus])

  async function handleSaveDrawer(advanceToNext = false) {
    if (!activeApp) return
    setIsSaving(true)
    try {
      await quickUpdateTriageField(activeApp.id, {
        applicationUrl: formUrl.trim() || null,
        dateApplied: formDateApplied.trim() ? formDateApplied.trim() : null,
        salary: formSalary.trim() || null,
        contactName: formContactName.trim() || null,
        contactEmail: formContactEmail.trim() || null,
        status: formStatus,
      })

      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 1500)

      if (advanceToNext) {
        // Find next item in filtered list
        const currentIndex = filteredApps.findIndex((item) => item.app.id === activeApp.id)
        if (currentIndex >= 0 && currentIndex < filteredApps.length - 1) {
          setActiveAppId(filteredApps[currentIndex + 1].app.id)
        } else {
          setActiveAppId(null)
        }
      }
      router.refresh()
    } catch (err) {
      console.error(err)
      alert('Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Stale / Ghosting Review Banner */}
      {staleApps.length > 0 && !isBannerDismissed && (
        <div className="p-4 sm:p-5 rounded-2xl bg-zinc-950/80 border border-zinc-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in duration-200">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-xl shrink-0">
              👻
            </div>
            <div>
              <h3 className="text-sm font-medium text-zinc-100">
                {staleApps.length} {staleApps.length === 1 ? 'application has' : 'applications have'} been inactive for 2+ weeks
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Transition stale applications to Ghosted to keep your active pipeline accurate.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={isBatchGhosting}
              onClick={async () => {
                setIsBatchGhosting(true)
                try {
                  await batchTransitionToGhosted(staleApps.map((a) => a.id))
                  router.refresh()
                } catch (err) {
                  console.error(err)
                  alert('Failed to transition applications')
                } finally {
                  setIsBatchGhosting(false)
                }
              }}
              className="text-xs font-semibold text-black bg-zinc-100 hover:bg-white px-3.5 py-2 rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              {isBatchGhosting ? 'Moving...' : `Ghost All (${staleApps.length})`}
            </button>

            <button
              type="button"
              onClick={() => setFilter('STALE')}
              className="text-xs font-medium text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-3.5 py-2 rounded-xl transition-colors cursor-pointer"
            >
              Review Stale
            </button>

            <button
              type="button"
              onClick={() => setIsBannerDismissed(true)}
              className="text-xs text-zinc-500 hover:text-zinc-300 p-2 rounded-lg hover:bg-zinc-900 transition-colors cursor-pointer"
              title="Dismiss for now"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0 ${
              filter === 'ALL'
                ? 'bg-zinc-100 text-black shadow-xs font-semibold'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
            }`}
          >
            All ({triageItems.length})
          </button>

          {counts.stale > 0 && (
            <button
              type="button"
              onClick={() => setFilter('STALE')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0 ${
                filter === 'STALE'
                  ? 'bg-zinc-800 text-zinc-100 border border-zinc-600 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
              }`}
            >
              <span>👻 Stale ({counts.stale})</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setFilter('DRAFTS')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0 ${
              filter === 'DRAFTS'
                ? 'bg-red-500/20 text-red-300 border border-red-500/40 font-semibold'
                : 'text-zinc-400 hover:text-red-300 hover:bg-zinc-900/50'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
            <span>Drafts ({counts.drafts})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilter('NO_URL')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0 ${
              filter === 'NO_URL'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
                : 'text-zinc-400 hover:text-amber-300 hover:bg-zinc-900/50'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span>Missing Links ({counts.noUrl})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilter('NO_DATE')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0 ${
              filter === 'NO_DATE'
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 font-semibold'
                : 'text-zinc-400 hover:text-blue-300 hover:bg-zinc-900/50'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            <span>Missing Date ({counts.noDate})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilter('NO_CONTACT')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0 ${
              filter === 'NO_CONTACT'
                ? 'bg-zinc-800 text-zinc-200 border border-zinc-700 font-semibold'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
            }`}
          >
            <span>No Contact ({counts.noContact})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilter('NO_SALARY')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0 ${
              filter === 'NO_SALARY'
                ? 'bg-zinc-800 text-zinc-200 border border-zinc-700 font-semibold'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
            }`}
          >
            <span>No Salary ({counts.noSalary})</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-56 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search role..."
            className="w-full bg-[#0c0c0e] border border-zinc-800 rounded-xl py-1.5 pl-8 pr-3 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700 transition-colors"
          />
        </div>
      </div>

      {/* Linear-Style Compact Table / List with Dedicated Columns */}
      <div className="border border-zinc-900 rounded-2xl overflow-hidden bg-zinc-950/40 divide-y divide-zinc-900/60">
        {/* Table Header */}
        <div className="hidden sm:flex items-center justify-between gap-4 px-5 py-3 bg-zinc-900/40 text-[11px] uppercase tracking-wider font-semibold text-zinc-500 border-b border-zinc-900">
          <div className="w-64">Company & Role</div>
          <div className="w-32">Status</div>
          <div className="flex-1">Missing Info</div>
          <div className="w-28 text-right">Action</div>
        </div>

        {filteredApps.map(({ app, issues }) => {
          const isSelected = activeAppId === app.id
          return (
            <div
              key={app.id}
              onClick={() => setActiveAppId(app.id)}
              className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3 hover:bg-zinc-900/40 transition-colors cursor-pointer group ${
                isSelected ? 'bg-zinc-900/60 ring-1 ring-zinc-700' : ''
              }`}
            >
              {/* 1. Company & Role */}
              <div className="flex items-center gap-3 w-full sm:w-64 truncate">
                <CompanyLogo
                  name={app.companyName}
                  url={app.applicationUrl}
                  className="w-8 h-8 rounded-lg shrink-0"
                />
                <div className="truncate">
                  <span className="font-semibold text-xs text-zinc-200 group-hover:text-white transition-colors truncate block">
                    {app.companyName}
                  </span>
                  <span className="text-[11px] text-zinc-400 truncate block mt-0.5">{app.roleTitle}</span>
                </div>
              </div>

              {/* 2. Status (Dedicated Column) */}
              <div className="w-full sm:w-32 shrink-0">
                <StatusBadge status={app.status} />
              </div>

              {/* 3. Missing Info Chips */}
              <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
                {issues.map((issue) => {
                  const chipStyle =
                    issue.tier === 'blocker'
                      ? 'bg-red-950/40 text-red-300 border-red-500/30'
                      : issue.tier === 'warning'
                      ? 'bg-amber-950/30 text-amber-300 border-amber-500/20'
                      : 'bg-zinc-900 text-zinc-400 border-zinc-800'

                  return (
                    <span
                      key={issue.key}
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-md border ${chipStyle}`}
                    >
                      {issue.label}
                    </span>
                  )
                })}
              </div>

              {/* 4. Actions */}
              <div className="flex items-center justify-end gap-2 w-full sm:w-28 shrink-0 self-end sm:self-center">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setActiveAppId(app.id)
                  }}
                  className="text-xs font-semibold text-zinc-200 bg-zinc-900 hover:bg-zinc-800 hover:text-white border border-zinc-800 px-3 py-1 rounded-lg transition-colors cursor-pointer"
                >
                  Quick Fill
                </button>
                <Link
                  href={`/applications/${app.slug}`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-zinc-500 hover:text-zinc-300 p-1 transition-colors"
                  title="View full application"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )
        })}

        {filteredApps.length === 0 && (
          <div className="py-12 px-4 text-center space-y-2">
            <CheckCircle2 className="w-7 h-7 text-emerald-400 mx-auto" />
            <div className="text-xs font-medium text-zinc-200">No applications to triage</div>
            <div className="text-[11px] text-zinc-500">
              All applications in this view have their essential info filled!
            </div>
          </div>
        )}
      </div>

      {/* ================= FAST TRIAGE INSPECTOR DRAWER ================= */}
      {activeApp && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            onClick={() => setActiveAppId(null)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
          />

          {/* Drawer Panel */}
          <div className="relative w-full max-w-md bg-[#0c0c0e] border-l border-zinc-800 h-full p-6 flex flex-col shadow-2xl z-10 animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 pb-4 border-b border-zinc-900">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <CompanyLogo
                  name={activeApp.companyName}
                  url={formUrl || activeApp.applicationUrl}
                  className="w-9 h-9 rounded-xl shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-white truncate" title={activeApp.companyName}>
                    {activeApp.companyName}
                  </h3>
                  <p className="text-xs text-zinc-400 truncate" title={activeApp.roleTitle}>
                    {activeApp.roleTitle}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <Link
                  href={`/applications/${activeApp.slug}`}
                  target="_blank"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition-colors"
                  title={`Open ${activeApp.companyName} page in new tab`}
                >
                  <span>Open Page</span>
                  <ExternalLink className="w-3 h-3 text-zinc-400" />
                </Link>
                <button
                  type="button"
                  onClick={() => setActiveAppId(null)}
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Drawer Form Fields */}
          <div className="p-6 space-y-6 flex-1 overflow-y-auto">
            {/* Stale Item Review Banner inside Drawer */}
            {activeApp && isAppStale(activeApp).isStale && (
              <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-base shrink-0">👻</span>
                  <span className="text-xs text-zinc-300 truncate">
                    Inactive for {isAppStale(activeApp).daysInactive}d ({activeApp.status})
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={async () => {
                      await quickUpdateTriageField(activeApp.id, { status: 'GHOSTED' })
                      router.refresh()
                    }}
                    className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-colors cursor-pointer"
                  >
                    Ghost
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await snoozeStaleApplication(activeApp.id, 14)
                      router.refresh()
                    }}
                    className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 transition-colors cursor-pointer"
                  >
                    Snooze 14d
                  </button>
                </div>
              </div>
            )}

            {/* Quick Status Bar in Drawer */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-300 block">
                  Application Status
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {STATUS_OPTIONS.map((opt) => {
                    const isSelected = formStatus === opt.value
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setFormStatus(opt.value as ApplicationStatus)}
                        className={`flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-all border cursor-pointer ${
                          isSelected ? opt.activeClass : opt.idleClass
                        }`}
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${opt.dotColor} ${
                              isSelected ? 'scale-110' : 'opacity-60'
                            }`}
                          />
                          <span className="truncate">{opt.label}</span>
                        </div>
                        {isSelected && <Check className={`w-3 h-3 shrink-0 ml-1 ${opt.checkColor}`} />}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Job Post URL */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                  <LinkIcon className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Job Post URL</span>
                  {!formUrl && <span className="text-red-400 font-normal">*</span>}
                </label>
                <input
                  type="url"
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  placeholder="https://company.com/careers/role"
                  className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors"
                />
              </div>

              {/* Date Applied */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Date Applied</span>
                    {!formDateApplied && formStatus !== 'SAVED' && (
                      <span className="text-red-400 font-normal">*</span>
                    )}
                  </label>
                  {!formDateApplied && (
                    <button
                      type="button"
                      onClick={() => setFormDateApplied(new Date().toISOString().split('T')[0])}
                      className="text-[11px] text-blue-400 hover:text-blue-300 hover:underline cursor-pointer"
                    >
                      Set Today
                    </button>
                  )}
                </div>
                <input
                  type="date"
                  value={formDateApplied}
                  onChange={(e) => setFormDateApplied(e.target.value)}
                  className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-zinc-100 focus:outline-none focus:border-zinc-500 transition-colors"
                />
              </div>

              {/* Target Salary */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Target Salary</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setFormSalary(formSalary === 'Not Disclosed' ? '' : 'Not Disclosed')}
                    className={`text-[11px] px-2 py-0.5 rounded-md border transition-colors cursor-pointer ${
                      formSalary === 'Not Disclosed'
                        ? 'bg-zinc-800 text-zinc-200 border-zinc-600'
                        : 'bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:border-zinc-700'
                    }`}
                  >
                    {formSalary === 'Not Disclosed' ? '✓ Not Disclosed' : 'Not Disclosed'}
                  </button>
                </div>
                <input
                  type="text"
                  value={formSalary}
                  onChange={(e) => setFormSalary(e.target.value)}
                  placeholder="e.g. $140k - $170k / ₹25 LPA or Not Disclosed"
                  className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors"
                />
              </div>

              {/* Contact Name & Email */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Recruiter / Contact</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setFormContactName(formContactName === 'No Direct Contact' ? '' : 'No Direct Contact')}
                    className={`text-[11px] px-2 py-0.5 rounded-md border transition-colors cursor-pointer ${
                      formContactName === 'No Direct Contact'
                        ? 'bg-zinc-800 text-zinc-200 border-zinc-600'
                        : 'bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:border-zinc-700'
                    }`}
                  >
                    {formContactName === 'No Direct Contact' ? '✓ No Direct Contact' : 'No Direct Contact'}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-zinc-400 block">Name</label>
                    <input
                      type="text"
                      value={formContactName}
                      onChange={(e) => setFormContactName(e.target.value)}
                      placeholder="e.g. Sarah Jenkins"
                      className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] text-zinc-400 block">Email or LinkedIn</label>
                    <input
                      type="text"
                      value={formContactEmail}
                      onChange={(e) => setFormContactEmail(e.target.value)}
                      placeholder="sarah@company.com"
                      className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-zinc-900 flex items-center justify-between gap-3 shrink-0">
              <div className="text-[11px] text-zinc-500">
                <kbd className="px-1.5 py-0.5 rounded border border-zinc-800 bg-zinc-900 font-mono text-zinc-400">
                  ⌘ + ↵
                </kbd>{' '}
                Save & Next
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSaveDrawer(false)}
                  disabled={isSaving}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-zinc-800 hover:bg-zinc-900 text-zinc-300 transition-colors cursor-pointer"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveDrawer(true)}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-black bg-zinc-100 hover:bg-white transition-all shadow-sm cursor-pointer"
                >
                  <span>{saveSuccess ? 'Saved!' : 'Save & Next'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
