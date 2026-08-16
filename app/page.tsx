import { prisma } from "@/lib/prisma"
import { ApplicationStatus, Application } from "@prisma/client"
import { format, isToday, isPast } from "date-fns"
import Link from "next/link"
import { ArrowRight, Clock, Building2, ExternalLink } from "lucide-react"
import { CompanyLogo } from "@/components/ui/avatars"

// Ensure dynamic rendering to always fetch latest data
export const dynamic = 'force-dynamic'

async function getDashboardData() {
  const totalApps = await prisma.application.count()
  const activeApps = await prisma.application.count({
    where: {
      status: { in: ['APPLIED', 'CONTACTED', 'SCREENING', 'INTERVIEW', 'ASSIGNMENT'] }
    }
  })
  const interviews = await prisma.application.count({
    where: { status: 'INTERVIEW' }
  })
  const offers = await prisma.application.count({
    where: { status: 'OFFER' }
  })
  const recentApps = await prisma.application.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' }
  })
  const followUps = await prisma.application.findMany({
    where: {
      nextFollowUpDate: { not: null },
      status: { notIn: ['REJECTED', 'ACCEPTED', 'WITHDRAWN', 'GHOSTED'] }
    },
    orderBy: { nextFollowUpDate: 'asc' },
    take: 5
  })

  // Get pipeline distribution
  const statusCounts = await prisma.application.groupBy({
    by: ['status'],
    _count: { status: true }
  })

  return { totalApps, activeApps, interviews, offers, recentApps, followUps, statusCounts }
}

function MetricBlock({ label, value }: { label: string, value: number }) {
  return (
    <div className="flex flex-col py-6 border-b border-zinc-900">
      <span className="text-4xl font-light tracking-tight mb-2">{value}</span>
      <span className="text-sm font-medium text-zinc-500 uppercase tracking-widest">{label}</span>
    </div>
  )
}

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

export default async function Dashboard() {
  const data = await getDashboardData()

  const pipelineOrder: ApplicationStatus[] = ['SAVED', 'APPLIED', 'CONTACTED', 'SCREENING', 'INTERVIEW', 'ASSIGNMENT', 'OFFER']
  const pipelineData = pipelineOrder.map(status => ({
    status,
    count: data.statusCounts.find(s => s.status === status)?._count.status || 0
  }))

  return (
    <div className="space-y-16 pb-20">
      {/* Header */}
      <header>
        <h1 className="text-4xl font-light tracking-tight mb-2">Overview</h1>
        <p className="text-zinc-400 text-sm">Where your job search stands right now.</p>
      </header>

      {/* Metrics Row */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-x-12">
        <MetricBlock label="Total Applied" value={data.totalApps} />
        <MetricBlock label="Active" value={data.activeApps} />
        <MetricBlock label="Interviews" value={data.interviews} />
        <MetricBlock label="Offers" value={data.offers} />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
        
        {/* Left Column: Recent & Pipeline */}
        <div className="lg:col-span-2 space-y-16">
          
          {/* Recent Applications */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-medium">Recent Applications</h2>
              <Link href="/applications" className="text-xs font-medium text-zinc-400 hover:text-white flex items-center gap-1 transition-colors">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            
            <div className="border border-zinc-900 rounded-lg overflow-hidden bg-zinc-950/30">
              <table className="w-full text-sm text-left">
                <thead className="bg-zinc-900/50 text-zinc-500 text-xs uppercase tracking-wider font-medium">
                  <tr>
                    <th className="px-6 py-3 font-medium">Company</th>
                    <th className="px-6 py-3 font-medium">Role</th>
                    <th className="px-6 py-3 font-medium hidden sm:table-cell">Date</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900/50">
                  {data.recentApps.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-zinc-500">
                        No applications yet. Press N to add one.
                      </td>
                    </tr>
                  ) : data.recentApps.map((app) => (
                    <tr key={app.id} className="hover:bg-zinc-900/30 transition-colors group">
                      <td className="px-6 py-4">
                        <Link href={`/applications/${app.slug}`} className="font-medium text-zinc-200 group-hover:text-white transition-colors flex items-center gap-3">
                          <CompanyLogo name={app.companyName} url={app.applicationUrl} />
                          {app.companyName}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-zinc-400">{app.roleTitle}</td>
                      <td className="px-6 py-4 text-zinc-500 hidden sm:table-cell">
                        {app.dateApplied ? format(new Date(app.dateApplied), 'MMM d') : '—'}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={app.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Pipeline Summary */}
          <section>
            <h2 className="text-lg font-medium mb-6">Pipeline Summary</h2>
            <div className="flex items-stretch justify-between gap-2">
              {pipelineData.map((item, index) => (
                <div key={item.status} className="flex-1 flex items-center">
                  <div className="flex flex-col gap-2">
                    <span className="text-2xl font-light text-zinc-300">{item.count}</span>
                    <span className="text-[10px] uppercase tracking-widest font-semibold text-zinc-500">
                      {item.status}
                    </span>
                  </div>
                  {index < pipelineData.length - 1 && (
                    <ArrowRight className="w-4 h-4 text-zinc-800 mx-auto" />
                  )}
                </div>
              ))}
            </div>
          </section>

        </div>

        {/* Right Column: Follow-ups */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Action Items</h2>
            <Link href="/follow-ups" className="text-xs font-medium text-zinc-400 hover:text-white flex items-center gap-1 transition-colors">
              Manage <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-3">
            {data.followUps.length === 0 ? (
              <div className="p-6 border border-zinc-900 rounded-lg bg-zinc-950/30 text-center">
                <p className="text-zinc-500 text-sm">You're all caught up. No follow-ups due.</p>
              </div>
            ) : data.followUps.map(app => {
              if (!app.nextFollowUpDate) return null
              const date = new Date(app.nextFollowUpDate)
              const isDueToday = isToday(date)
              const isOverdue = isPast(date) && !isDueToday

              return (
                <div key={app.id} className="p-4 border border-zinc-900 rounded-lg hover:border-zinc-700 transition-colors bg-zinc-950/30 group">
                  <div className="flex items-start justify-between mb-2">
                    <Link href={`/applications/${app.slug}`} className="font-medium text-sm text-zinc-200 group-hover:text-white transition-colors">
                      {app.companyName}
                    </Link>
                    <span className={cn(
                      "text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full border",
                      isOverdue ? "text-red-400 border-red-400/20 bg-red-400/10" :
                      isDueToday ? "text-amber-400 border-amber-400/20 bg-amber-400/10" :
                      "text-zinc-400 border-zinc-800 bg-zinc-900/50"
                    )}>
                      {isOverdue ? 'Overdue' : isDueToday ? 'Today' : format(date, 'MMM d')}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 mb-3">{app.roleTitle}</p>
                  
                  <div className="flex items-center gap-2">
                    <button className="text-xs font-medium text-zinc-400 hover:text-white flex items-center gap-1.5 transition-colors">
                      <Clock className="w-3 h-3" /> Mark as done
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ')
}
