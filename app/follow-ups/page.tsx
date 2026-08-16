import { prisma } from "@/lib/prisma"
import { format, isPast, isToday, startOfDay } from "date-fns"
import Link from "next/link"
import { Clock, CheckCircle2, ArrowRight } from "lucide-react"

export const dynamic = 'force-dynamic'

export default async function FollowUpsPage() {
  const applications = await prisma.application.findMany({
    where: {
      nextFollowUpDate: { not: null },
      status: { notIn: ['REJECTED', 'ACCEPTED', 'WITHDRAWN', 'GHOSTED'] }
    },
    orderBy: { nextFollowUpDate: 'asc' }
  })

  const now = new Date()
  const todayStart = startOfDay(now)

  const overdue = applications.filter(app => app.nextFollowUpDate && isPast(app.nextFollowUpDate) && !isToday(app.nextFollowUpDate))
  const today = applications.filter(app => app.nextFollowUpDate && isToday(app.nextFollowUpDate))
  const upcoming = applications.filter(app => app.nextFollowUpDate && !isPast(app.nextFollowUpDate) && !isToday(app.nextFollowUpDate))

  return (
    <div className="max-w-4xl space-y-16 pb-20">
      <header>
        <h1 className="text-4xl font-light tracking-tight mb-2">Follow-ups</h1>
        <p className="text-zinc-400 text-sm">Task manager for your active job search.</p>
      </header>

      <div className="space-y-12">
        {/* Overdue */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-red-400 mb-6 flex items-center gap-2">
            Overdue <span className="bg-red-400/10 px-2 py-0.5 rounded-full text-xs">{overdue.length}</span>
          </h2>
          <div className="space-y-3">
            {overdue.length === 0 ? (
              <p className="text-sm text-zinc-600 italic">No overdue follow-ups.</p>
            ) : overdue.map(app => (
              <FollowUpCard key={app.id} app={app} variant="overdue" />
            ))}
          </div>
        </section>

        {/* Today */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-amber-400 mb-6 flex items-center gap-2">
            Today <span className="bg-amber-400/10 px-2 py-0.5 rounded-full text-xs">{today.length}</span>
          </h2>
          <div className="space-y-3">
            {today.length === 0 ? (
              <p className="text-sm text-zinc-600 italic">No follow-ups due today.</p>
            ) : today.map(app => (
              <FollowUpCard key={app.id} app={app} variant="today" />
            ))}
          </div>
        </section>

        {/* Upcoming */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400 mb-6 flex items-center gap-2">
            Upcoming <span className="bg-zinc-900 px-2 py-0.5 rounded-full text-xs">{upcoming.length}</span>
          </h2>
          <div className="space-y-3">
            {upcoming.length === 0 ? (
              <p className="text-sm text-zinc-600 italic">No upcoming follow-ups scheduled.</p>
            ) : upcoming.map(app => (
              <FollowUpCard key={app.id} app={app} variant="upcoming" />
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

function FollowUpCard({ app, variant }: { app: any, variant: 'overdue' | 'today' | 'upcoming' }) {
  const date = new Date(app.nextFollowUpDate)
  
  return (
    <div className={`p-4 border rounded-lg transition-colors group flex items-start justify-between gap-4 ${
      variant === 'overdue' ? 'border-red-900/50 bg-red-950/10 hover:border-red-900' :
      variant === 'today' ? 'border-amber-900/50 bg-amber-950/10 hover:border-amber-900' :
      'border-zinc-900 bg-zinc-950/30 hover:border-zinc-800'
    }`}>
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Link href={`/applications/${app.slug}`} className="font-medium text-zinc-200 group-hover:text-white transition-colors">
            {app.companyName}
          </Link>
          <span className="text-xs text-zinc-500">{app.roleTitle}</span>
        </div>
        
        <div className="flex items-center gap-4 text-sm mt-3">
          <span className={`font-medium ${
            variant === 'overdue' ? 'text-red-400' :
            variant === 'today' ? 'text-amber-400' :
            'text-zinc-400'
          }`}>
            {variant === 'today' ? 'Today' : format(date, 'MMM d, yyyy')}
          </span>
          {app.contactName && (
            <span className="text-zinc-500">Contact: <span className="text-zinc-300">{app.contactName}</span></span>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-2 shrink-0">
        <button className="flex items-center justify-center w-8 h-8 rounded border border-zinc-800 text-zinc-500 hover:text-emerald-400 hover:border-emerald-900 hover:bg-emerald-950/30 transition-all" title="Mark complete">
          <CheckCircle2 className="w-4 h-4" />
        </button>
        <Link href={`/applications/${app.slug}`} className="flex items-center justify-center w-8 h-8 rounded border border-zinc-800 text-zinc-500 hover:text-white hover:bg-zinc-900 transition-all" title="View details">
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  )
}
