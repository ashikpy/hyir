'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { format, isPast, isToday } from 'date-fns'
import { Search, Filter, ArrowUpDown, Check, X } from 'lucide-react'
import { ApplicationStatus } from '@prisma/client'
import { CompanyLogo } from '@/components/ui/avatars'

interface ApplicationItem {
  id: string
  slug: string
  companyName: string
  roleTitle: string
  status: ApplicationStatus
  jobType: string
  workplaceType: string
  location: string | null
  contactName: string | null
  dateApplied: Date | string | null
  nextFollowUpDate: Date | string | null
  applicationUrl: string | null
}

function StatusBadge({ status }: { status: ApplicationStatus }) {
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
    <span className={`text-[10px] uppercase tracking-wider font-semibold px-2.5 py-0.5 border rounded-full ${config}`}>
      {status.replace('_', ' ')}
    </span>
  )
}

function FollowUpDisplay({ date }: { date: Date | string | null }) {
  if (!date) return <span className="text-zinc-700">—</span>

  const dateObj = new Date(date)
  const isDueToday = isToday(dateObj)
  const isOverdue = isPast(dateObj) && !isDueToday

  if (isOverdue) return <span className="text-red-400 font-medium text-xs">Overdue</span>
  if (isDueToday) return <span className="text-amber-400 font-medium text-xs">Today</span>
  return <span className="text-zinc-400 text-xs">{format(dateObj, 'MMM d')}</span>
}

export function ApplicationsTable({ applications }: { applications: ApplicationItem[] }) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [sortField, setSortField] = useState<'company' | 'applied'>('applied')
  const [sortAsc, setSortAsc] = useState(false)

  const filteredApplications = useMemo(() => {
    let result = applications.filter((app) => {
      const matchSearch =
        search === '' ||
        app.companyName.toLowerCase().includes(search.toLowerCase()) ||
        app.roleTitle.toLowerCase().includes(search.toLowerCase()) ||
        (app.contactName && app.contactName.toLowerCase().includes(search.toLowerCase())) ||
        (app.location && app.location.toLowerCase().includes(search.toLowerCase())) ||
        app.status.toLowerCase().includes(search.toLowerCase())

      const matchStatus = statusFilter === 'ALL' || app.status === statusFilter

      return matchSearch && matchStatus
    })

    result.sort((a, b) => {
      if (sortField === 'company') {
        const cmp = a.companyName.localeCompare(b.companyName)
        return sortAsc ? cmp : -cmp
      } else {
        const dateA = a.dateApplied ? new Date(a.dateApplied).getTime() : 0
        const dateB = b.dateApplied ? new Date(b.dateApplied).getTime() : 0
        return sortAsc ? dateA - dateB : dateB - dateA
      }
    })

    return result
  }, [applications, search, statusFilter, sortField, sortAsc])

  const toggleSort = (field: 'company' | 'applied') => {
    if (sortField === field) {
      setSortAsc(!sortAsc)
    } else {
      setSortField(field)
      setSortAsc(false)
    }
  }

  const allStatuses = ['ALL', ...Object.keys(ApplicationStatus)]

  return (
    <div className="space-y-6">
      {/* Controls: Search & Filter */}
      <div className="flex items-center gap-3 relative">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search company, role, location, contact..."
            className="w-full bg-[#0c0c0e] border border-zinc-800 rounded-xl py-2 pl-10 pr-9 text-sm text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-700 transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`flex items-center gap-2 border px-3.5 py-2 rounded-xl text-xs font-medium transition-colors ${
              statusFilter !== 'ALL'
                ? 'border-blue-500/50 bg-blue-950/30 text-blue-300'
                : 'border-zinc-800 bg-[#0c0c0e] hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>{statusFilter === 'ALL' ? 'Filter' : statusFilter.replace('_', ' ')}</span>
          </button>

          {isFilterOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-[#0c0c0e] border border-zinc-800 rounded-xl shadow-2xl py-1.5 z-30 max-h-64 overflow-y-auto">
              {allStatuses.map((st) => (
                <button
                  key={st}
                  onClick={() => {
                    setStatusFilter(st)
                    setIsFilterOpen(false)
                  }}
                  className="w-full px-3 py-1.5 text-left text-xs font-medium text-zinc-300 hover:bg-zinc-800/80 flex items-center justify-between transition-colors"
                >
                  <span>{st === 'ALL' ? 'All Statuses' : st.replace('_', ' ')}</span>
                  {statusFilter === st && <Check className="w-3.5 h-3.5 text-blue-400" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Table: company, status, type, location (separate), contact, applied, follow-up */}
      <div className="border border-zinc-900 rounded-2xl overflow-hidden bg-zinc-950/40">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-zinc-900/60 text-zinc-500 text-[11px] uppercase tracking-wider font-semibold border-b border-zinc-900">
              <tr>
                <th
                  onClick={() => toggleSort('company')}
                  className="px-5 py-3.5 cursor-pointer hover:text-zinc-300 group select-none"
                >
                  <div className="flex items-center gap-2">
                    Company & Role
                    <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Type</th>
                <th className="px-5 py-3.5">Location</th>
                <th className="px-5 py-3.5">Contact</th>
                <th
                  onClick={() => toggleSort('applied')}
                  className="px-5 py-3.5 cursor-pointer hover:text-zinc-300 group select-none"
                >
                  <div className="flex items-center gap-2">
                    Applied
                    <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </th>
                <th className="px-5 py-3.5">Follow-up</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900/60">
              {filteredApplications.map((app) => (
                <tr key={app.id} className="hover:bg-zinc-900/30 transition-colors group">
                  {/* 1. Company */}
                  <td className="px-5 py-3.5">
                    <Link
                      href={`/applications/${app.slug}`}
                      className="flex items-center gap-3 group/link"
                    >
                      <CompanyLogo name={app.companyName} url={app.applicationUrl} />
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-zinc-200 group-hover/link:text-white transition-colors">
                          {app.companyName}
                        </span>
                        <span className="text-xs text-zinc-400 truncate max-w-[200px]">
                          {app.roleTitle}
                        </span>
                      </div>
                    </Link>
                  </td>

                  {/* 2. Status */}
                  <td className="px-5 py-3.5">
                    <StatusBadge status={app.status} />
                  </td>

                  {/* 3. Type */}
                  <td className="px-5 py-3.5 text-zinc-300 text-xs font-medium">
                    {app.jobType.replace('_', ' ')}
                  </td>

                  {/* 4. Location (Separate column) */}
                  <td className="px-5 py-3.5 text-xs text-zinc-300">
                    {app.location || (
                      <span className="text-zinc-500">{app.workplaceType}</span>
                    )}
                  </td>

                  {/* 5. Contact */}
                  <td className="px-5 py-3.5 text-zinc-300 text-xs">
                    {app.contactName || <span className="text-zinc-700">—</span>}
                  </td>

                  {/* 6. Applied Date */}
                  <td className="px-5 py-3.5 text-zinc-400 text-xs">
                    {app.dateApplied
                      ? format(new Date(app.dateApplied), 'MMM d, yyyy')
                      : <span className="text-zinc-700">—</span>}
                  </td>

                  {/* 7. Follow-up */}
                  <td className="px-5 py-3.5">
                    <FollowUpDisplay date={app.nextFollowUpDate} />
                  </td>
                </tr>
              ))}

              {filteredApplications.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-zinc-500">
                    <p className="text-sm font-medium text-zinc-300">No applications match your search</p>
                    <p className="text-xs text-zinc-600 mt-1">Try clearing filters or search keywords</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
