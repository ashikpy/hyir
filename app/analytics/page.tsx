import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

export default async function AnalyticsPage() {
  const applications = await prisma.application.findMany()

  const total = applications.length

  // Funnel counts
  const appliedOrHigher = applications.filter(a => a.status !== 'SAVED').length
  const responses = applications.filter(a => ['SCREENING', 'INTERVIEW', 'ASSIGNMENT', 'OFFER', 'ACCEPTED', 'REJECTED'].includes(a.status)).length
  const interviews = applications.filter(a => ['INTERVIEW', 'ASSIGNMENT', 'OFFER', 'ACCEPTED'].includes(a.status)).length
  const offers = applications.filter(a => ['OFFER', 'ACCEPTED'].includes(a.status)).length

  // Rates
  const responseRate = total > 0 ? Math.round((responses / total) * 100) : 0
  const interviewRate = total > 0 ? Math.round((interviews / total) * 100) : 0
  const offerRate = total > 0 ? Math.round((offers / total) * 100) : 0

  return (
    <div className="max-w-4xl space-y-16 pb-20">
      <header>
        <h1 className="text-4xl font-light tracking-tight mb-2">Analytics</h1>
        <p className="text-zinc-400 text-sm">Understand your job search performance.</p>
      </header>

      {/* Top Metrics */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-x-12">
        <div className="flex flex-col py-6 border-b border-zinc-900">
          <span className="text-4xl font-light tracking-tight mb-2">{total}</span>
          <span className="text-sm font-medium text-zinc-500 uppercase tracking-widest">Total Apps</span>
        </div>
        <div className="flex flex-col py-6 border-b border-zinc-900">
          <span className="text-4xl font-light tracking-tight mb-2">{responseRate}%</span>
          <span className="text-sm font-medium text-zinc-500 uppercase tracking-widest">Response Rate</span>
        </div>
        <div className="flex flex-col py-6 border-b border-zinc-900">
          <span className="text-4xl font-light tracking-tight mb-2">{interviewRate}%</span>
          <span className="text-sm font-medium text-zinc-500 uppercase tracking-widest">Interview Rate</span>
        </div>
        <div className="flex flex-col py-6 border-b border-zinc-900">
          <span className="text-4xl font-light tracking-tight mb-2">{offerRate}%</span>
          <span className="text-sm font-medium text-zinc-500 uppercase tracking-widest">Offer Rate</span>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
        {/* Application Funnel */}
        <section>
          <h2 className="text-lg font-medium mb-8">Application Funnel</h2>
          <div className="space-y-6">
            <FunnelStage label="Applications" count={total} total={total} />
            <FunnelStage label="Responses" count={responses} total={total} />
            <FunnelStage label="Interviews" count={interviews} total={total} />
            <FunnelStage label="Offers" count={offers} total={total} />
          </div>
        </section>

        {/* Status Distribution */}
        <section>
          <h2 className="text-lg font-medium mb-8">Current Pipeline Status</h2>
          <div className="space-y-4">
            {['APPLIED', 'CONTACTED', 'SCREENING', 'INTERVIEW', 'ASSIGNMENT', 'OFFER', 'REJECTED', 'GHOSTED'].map(status => {
              const count = applications.filter(a => a.status === status).length
              if (count === 0 && status !== 'OFFER') return null
              return (
                <div key={status} className="flex items-center gap-4">
                  <span className="w-24 text-xs font-semibold uppercase tracking-widest text-zinc-500">{status}</span>
                  <div className="flex-1 h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${status === 'OFFER' ? 'bg-emerald-400' : status === 'REJECTED' ? 'bg-red-400' : 'bg-zinc-500'}`} 
                      style={{ width: `${total > 0 ? (count / total) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-sm font-medium text-zinc-300">{count}</span>
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}

function FunnelStage({ label, count, total }: { label: string, count: number, total: number }) {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0
  
  return (
    <div className="group">
      <div className="flex items-end justify-between mb-2">
        <span className="text-sm font-semibold uppercase tracking-widest text-zinc-400">{label}</span>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-light text-white">{count}</span>
          <span className="text-sm text-zinc-600">{percentage}%</span>
        </div>
      </div>
      <div className="h-1 bg-zinc-900 rounded-full overflow-hidden">
        <div 
          className="h-full bg-zinc-400 transition-all duration-1000 ease-out group-hover:bg-zinc-200" 
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
