import { prisma } from "@/lib/prisma"
import { format, isPast, isToday } from "date-fns"
import Link from "next/link"
import { Search, Plus, Filter, ArrowUpDown } from "lucide-react"
import { ApplicationStatus } from "@prisma/client"
import { AddApplicationButton } from "@/components/ui/add-app-button"
import { CompanyLogo } from "@/components/ui/avatars"

export const dynamic = 'force-dynamic'

function StatusBadge({ status }: { status: ApplicationStatus }) {
  const statusConfig: Record<ApplicationStatus, string> = {
    SAVED: 'text-zinc-500 border-zinc-800',
    APPLIED: 'text-blue-400 border-blue-400/20',
    CONTACTED: 'text-purple-400 border-purple-400/20',
    SCREENING: 'text-amber-400 border-amber-400/20',
    INTERVIEW: 'text-orange-400 border-orange-400/20',
    ASSIGNMENT: 'text-indigo-400 border-indigo-400/20',
    OFFER: 'text-emerald-400 border-emerald-400/20 bg-emerald-400/10',
    ACCEPTED: 'text-emerald-500 border-emerald-500/20 bg-emerald-500/10',
    REJECTED: 'text-red-400 border-red-400/20',
    GHOSTED: 'text-zinc-500 border-zinc-800',
    WITHDRAWN: 'text-zinc-500 border-zinc-800',
  }

  const config = statusConfig[status] || statusConfig.SAVED

  return (
    <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 border rounded-full ${config}`}>
      {status.replace('_', ' ')}
    </span>
  )
}

function FollowUpDisplay({ date }: { date: Date | null }) {
  if (!date) return <span className="text-zinc-600">—</span>

  const isDueToday = isToday(date)
  const isOverdue = isPast(date) && !isDueToday

  if (isOverdue) return <span className="text-red-400 font-medium">Overdue</span>
  if (isDueToday) return <span className="text-amber-400 font-medium">Today</span>
  return <span className="text-zinc-400">{format(date, 'MMM d')}</span>
}

export default async function ApplicationsPage() {
  const applications = await prisma.application.findMany({
    orderBy: { updatedAt: 'desc' }
  })

  return (
    <div className="space-y-8 pb-20">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-4xl font-light tracking-tight mb-2">Job Applications</h1>
          <p className="text-zinc-400 text-sm">{applications.length} total applications</p>
        </div>
        <AddApplicationButton className="flex items-center gap-2 bg-zinc-100 hover:bg-white text-black px-4 py-2 rounded-md text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> Add Application
        </AddApplicationButton>
      </header>

      {/* Controls */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input 
            type="text" 
            placeholder="Search company, role, or contact..." 
            className="w-full bg-zinc-950/50 border border-zinc-900 rounded-lg py-2 pl-10 pr-4 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700 focus:bg-black transition-colors"
          />
        </div>
        <button className="flex items-center gap-2 border border-zinc-900 bg-zinc-950/30 hover:bg-zinc-900 text-zinc-400 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Filter className="w-4 h-4" /> Filter
        </button>
      </div>

      {/* Table */}
      <div className="border border-zinc-900 rounded-lg overflow-hidden bg-zinc-950/30">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-zinc-900/50 text-zinc-500 text-xs uppercase tracking-wider font-medium">
              <tr>
                <th className="px-6 py-3 font-medium cursor-pointer hover:text-zinc-300 group">
                  <div className="flex items-center gap-2">Company <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-100" /></div>
                </th>
                <th className="px-6 py-3 font-medium">Role</th>
                <th className="px-6 py-3 font-medium cursor-pointer hover:text-zinc-300 group">
                  <div className="flex items-center gap-2">Applied <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-100" /></div>
                </th>
                <th className="px-6 py-3 font-medium">Type & Location</th>
                <th className="px-6 py-3 font-medium">Contact</th>
                <th className="px-6 py-3 font-medium">Follow-up</th>
                <th className="px-6 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900/50">
              {applications.map((app) => (
                <tr key={app.id} className="hover:bg-zinc-900/30 transition-colors group">
                  <td className="px-6 py-4">
                    <Link href={`/applications/${app.slug}`} className="font-medium text-zinc-200 group-hover:text-white transition-colors flex items-center gap-3">
                      <CompanyLogo name={app.companyName} url={app.applicationUrl} />
                      {app.companyName}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-zinc-400 max-w-[200px] truncate">{app.roleTitle}</td>
                  <td className="px-6 py-4 text-zinc-500">
                    {app.dateApplied ? format(new Date(app.dateApplied), 'MMM d, yyyy') : '—'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-zinc-400">{app.jobType.replace('_', ' ')}</span>
                      <span className="text-xs text-zinc-600">{app.location || app.workplaceType}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-zinc-500">
                    {app.contactName || <span className="text-zinc-700">—</span>}
                  </td>
                  <td className="px-6 py-4">
                    <FollowUpDisplay date={app.nextFollowUpDate} />
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={app.status} />
                  </td>
                </tr>
              ))}
              {applications.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-zinc-500">
                    <div className="flex flex-col items-center gap-2">
                      <p>No applications found.</p>
                      <button className="text-zinc-400 hover:text-white transition-colors">Add your first application</button>
                    </div>
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
