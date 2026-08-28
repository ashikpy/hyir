'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { format, isPast, isToday } from 'date-fns'
import { ApplicationStatus } from '@prisma/client'
import { CompanyLogo } from '@/components/ui/avatars'
import { EditApplicationModal } from '@/components/ui/edit-app-modal'
import {
  AlertCircle,
  Sparkles,
  CheckCircle2,
  Clock,
  Link as LinkIcon,
  DollarSign,
  User,
  FileText,
  ArrowRight,
  Search,
  Filter,
  Check
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
}

export type TriageTier = 'IMPORTANT' | 'NICE_TO_FINISH' | 'CAN_FINISH'

export interface TriageIssue {
  tier: TriageTier
  type: string
  title: string
  description: string
}

export function computeTriageIssues(app: TriageApp): TriageIssue[] {
  const issues: TriageIssue[] = []

  // Tier 1: Important to Finish
  if (app.status === 'SAVED') {
    issues.push({
      tier: 'IMPORTANT',
      type: 'DRAFT',
      title: 'Unfinished Draft',
      description: 'Application is saved as draft and not marked as applied yet.',
    })
  }

  if (!app.applicationUrl) {
    issues.push({
      tier: 'IMPORTANT',
      type: 'MISSING_URL',
      title: 'Missing Job Post URL',
      description: 'No career link or post URL attached for reference.',
    })
  }

  if (app.nextFollowUpDate) {
    const due = new Date(app.nextFollowUpDate)
    if (isPast(due) && !isToday(due) && app.status !== 'REJECTED' && app.status !== 'GHOSTED') {
      issues.push({
        tier: 'IMPORTANT',
        type: 'OVERDUE_FOLLOWUP',
        title: 'Overdue Follow-up',
        description: `Follow-up was scheduled for ${format(due, 'MMM d')}.`,
      })
    }
  }

  // Tier 2: Nice to Finish
  if (!app.contactName && app.status !== 'SAVED') {
    issues.push({
      tier: 'NICE_TO_FINISH',
      type: 'MISSING_CONTACT',
      title: 'Missing Recruiter Contact',
      description: 'No recruiter or hiring manager contact details logged.',
    })
  }

  if (!app.salary) {
    issues.push({
      tier: 'NICE_TO_FINISH',
      type: 'MISSING_SALARY',
      title: 'Missing Target Salary',
      description: 'No compensation range recorded for negotiation leverage.',
    })
  }

  if (app.status === 'INTERVIEW' && !app.nextFollowUpDate) {
    issues.push({
      tier: 'NICE_TO_FINISH',
      type: 'UNSCHEDULED_INTERVIEW',
      title: 'Interview Missing Next Date',
      description: 'In Interview stage but no follow-up/round date is scheduled.',
    })
  }

  // Tier 3: Can Finish
  if (!app.notes || app.notes.trim() === '') {
    issues.push({
      tier: 'CAN_FINISH',
      type: 'MISSING_NOTES',
      title: 'Empty Prep Notes',
      description: 'No talking points, company context, or strategy notes recorded.',
    })
  }

  if (!app.resumeVersion && !app.portfolioVersion) {
    issues.push({
      tier: 'CAN_FINISH',
      type: 'MISSING_DOC_VERSION',
      title: 'Missing Resume / Portfolio Tag',
      description: 'Document version submitted was not logged.',
    })
  }

  return issues
}

export function TriageView({ applications }: { applications: TriageApp[] }) {
  const [selectedTier, setSelectedTier] = useState<'ALL' | TriageTier>('ALL')
  const [search, setSearch] = useState('')
  const [editingApp, setEditingApp] = useState<TriageApp | null>(null)

  // Map each app with its issues
  const appsWithIssues = useMemo(() => {
    return applications
      .map((app) => ({
        app,
        issues: computeTriageIssues(app),
      }))
      .filter((item) => item.issues.length > 0)
  }, [applications])

  // Count totals per tier
  const tierCounts = useMemo(() => {
    let important = 0
    let nice = 0
    let can = 0

    appsWithIssues.forEach(({ issues }) => {
      if (issues.some((i) => i.tier === 'IMPORTANT')) important++
      if (issues.some((i) => i.tier === 'NICE_TO_FINISH')) nice++
      if (issues.some((i) => i.tier === 'CAN_FINISH')) can++
    })

    return { important, nice, can }
  }, [appsWithIssues])

  // Filtered list
  const filteredList = useMemo(() => {
    return appsWithIssues.filter(({ app, issues }) => {
      const matchesSearch =
        search === '' ||
        app.companyName.toLowerCase().includes(search.toLowerCase()) ||
        app.roleTitle.toLowerCase().includes(search.toLowerCase())

      const matchesTier =
        selectedTier === 'ALL' || issues.some((i) => i.tier === selectedTier)

      return matchesSearch && matchesTier
    })
  }, [appsWithIssues, search, selectedTier])

  const totalApps = applications.length
  const completedCleanApps = totalApps - appsWithIssues.length
  const healthPercent = totalApps > 0 ? Math.round((completedCleanApps / totalApps) * 100) : 100

  return (
    <div className="space-y-8 pb-16">
      {/* Top Banner: Pipeline Health & Stats */}
      <div className="p-6 rounded-2xl bg-zinc-950/60 border border-zinc-900 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-light tracking-tight text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              Pipeline Health Score
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              {appsWithIssues.length === 0
                ? 'All applications are 100% complete with all details filled!'
                : `${appsWithIssues.length} applications have missing details across 3 priority tiers.`}
            </p>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto">
            <span className="text-3xl font-light text-white font-mono">{healthPercent}%</span>
            <span className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">
              Completeness
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden">
          <div
            className="bg-emerald-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${healthPercent}%` }}
          />
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Tier Selector Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-zinc-950/80 border border-zinc-800/80 rounded-xl overflow-x-auto">
          <button
            type="button"
            onClick={() => setSelectedTier('ALL')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              selectedTier === 'ALL'
                ? 'bg-zinc-100 text-black shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
            }`}
          >
            <span>All Issues</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-zinc-900 text-zinc-400 font-mono">
              {appsWithIssues.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedTier('IMPORTANT')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              selectedTier === 'IMPORTANT'
                ? 'bg-red-500/20 text-red-300 border border-red-500/50'
                : 'text-zinc-400 hover:text-red-400 hover:bg-zinc-900/50'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-red-400" />
            <span>Important to Finish</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-red-950/60 text-red-300 font-mono">
              {tierCounts.important}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedTier('NICE_TO_FINISH')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              selectedTier === 'NICE_TO_FINISH'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                : 'text-zinc-400 hover:text-amber-400 hover:bg-zinc-900/50'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>Nice to Finish</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-950/60 text-amber-300 font-mono">
              {tierCounts.nice}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedTier('CAN_FINISH')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              selectedTier === 'CAN_FINISH'
                ? 'bg-zinc-800 text-zinc-200 border border-zinc-700'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-zinc-500" />
            <span>Can Finish</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-zinc-900 text-zinc-400 font-mono">
              {tierCounts.can}
            </span>
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search company or role..."
            className="w-full bg-[#0c0c0e] border border-zinc-800 rounded-xl py-2 pl-9 pr-3 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700"
          />
        </div>
      </div>

      {/* Cards List */}
      <div className="space-y-4">
        {filteredList.map(({ app, issues }) => {
          const importantCount = issues.filter((i) => i.tier === 'IMPORTANT').length
          const niceCount = issues.filter((i) => i.tier === 'NICE_TO_FINISH').length
          const canCount = issues.filter((i) => i.tier === 'CAN_FINISH').length

          return (
            <div
              key={app.id}
              className="p-5 rounded-2xl border border-zinc-900 bg-zinc-950/40 hover:border-zinc-800 transition-all space-y-4 shadow-sm"
            >
              {/* Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3.5 min-w-0">
                  <CompanyLogo
                    name={app.companyName}
                    url={app.applicationUrl}
                    className="w-9 h-9 rounded-xl shrink-0"
                  />
                  <div className="truncate">
                    <Link
                      href={`/applications/${app.slug}`}
                      className="font-semibold text-sm text-zinc-100 hover:text-white transition-colors truncate block"
                    >
                      {app.companyName}
                    </Link>
                    <p className="text-xs text-zinc-400 truncate">{app.roleTitle}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setEditingApp(app)}
                    className="text-xs font-semibold text-black bg-zinc-100 hover:bg-white px-3.5 py-1.5 rounded-xl transition-all shadow-sm cursor-pointer"
                  >
                    Fix Missing Info
                  </button>
                  <Link
                    href={`/applications/${app.slug}`}
                    className="text-xs font-medium text-zinc-400 hover:text-zinc-200 border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 rounded-xl transition-colors"
                  >
                    View Role →
                  </Link>
                </div>
              </div>

              {/* Issues Badges / Checklist */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-2 border-t border-zinc-900">
                {issues.map((issue, idx) => {
                  const badgeColor =
                    issue.tier === 'IMPORTANT'
                      ? 'border-red-500/30 bg-red-950/30 text-red-300'
                      : issue.tier === 'NICE_TO_FINISH'
                      ? 'border-amber-500/30 bg-amber-950/30 text-amber-300'
                      : 'border-zinc-800 bg-zinc-900/50 text-zinc-400'

                  return (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-xl border text-xs flex items-start gap-2 ${badgeColor}`}
                    >
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <div className="font-semibold leading-tight">{issue.title}</div>
                        <div className="text-[11px] opacity-80 mt-0.5 leading-snug">
                          {issue.description}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        {filteredList.length === 0 && (
          <div className="p-12 text-center border border-dashed border-zinc-900 rounded-2xl bg-zinc-950/20 space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <h3 className="text-sm font-medium text-zinc-200">No triage issues found</h3>
            <p className="text-xs text-zinc-500">
              Applications matching your filter are completely filled and up to date!
            </p>
          </div>
        )}
      </div>

      {/* Edit Modal Hook */}
      {editingApp && (
        <EditApplicationModal
          application={editingApp as any}
          onClose={() => setEditingApp(null)}
        />
      )}
    </div>
  )
}
