import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { ApplicationStatus, Application } from "@prisma/client"
import { format } from "date-fns"
import { CompanyLogo } from "@/components/ui/avatars"

export const dynamic = 'force-dynamic'

const PIPELINE_STAGES: { status: ApplicationStatus; label: string }[] = [
  { status: 'SAVED', label: 'Saved' },
  { status: 'APPLIED', label: 'Applied' },
  { status: 'CONTACTED', label: 'Contacted' },
  { status: 'SCREENING', label: 'Screening' },
  { status: 'INTERVIEW', label: 'Interview' },
  { status: 'ASSIGNMENT', label: 'Assignment' },
  { status: 'OFFER', label: 'Offer' },
]

export default async function PipelinePage() {
  const applications = await prisma.application.findMany({
    where: {
      status: { in: PIPELINE_STAGES.map(s => s.status) }
    },
    orderBy: { updatedAt: 'desc' }
  })

  // Group applications by status
  const groupedApps: Record<string, Application[]> = {}
  PIPELINE_STAGES.forEach(stage => {
    groupedApps[stage.status] = applications.filter(app => app.status === stage.status)
  })

  return (
    <div className="flex flex-col h-full overflow-hidden pb-12">
      <header className="mb-8 shrink-0">
        <h1 className="text-4xl font-light tracking-tight mb-2">Pipeline</h1>
        <p className="text-zinc-400 text-sm">Visual overview of active applications.</p>
      </header>

      {/* Kanban Board */}
      <div className="flex gap-6 overflow-x-auto pb-8 flex-1 items-start snap-x snap-mandatory">
        {PIPELINE_STAGES.map(stage => {
          const apps = groupedApps[stage.status] || []
          return (
            <div key={stage.status} className="flex flex-col w-[300px] shrink-0 snap-start h-full">
              {/* Column Header */}
              <div className="flex items-center justify-between mb-4 px-1">
                <h3 className="text-xs uppercase tracking-widest font-semibold text-zinc-400">{stage.label}</h3>
                <span className="text-xs font-medium text-zinc-600 bg-zinc-900/50 px-2 py-0.5 rounded-full border border-zinc-800">
                  {apps.length}
                </span>
              </div>

              {/* Column Cards */}
              <div className="flex flex-col gap-3 overflow-y-auto pr-2 pb-4 scrollbar-thin">
                {apps.map(app => (
                  <Link 
                    key={app.id} 
                    href={`/applications/${app.slug}`}
                    className="group bg-zinc-950 border border-zinc-900 hover:border-zinc-700 rounded-lg p-4 transition-all hover:-translate-y-0.5 shadow-sm hover:shadow-xl hover:shadow-black/50"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <CompanyLogo name={app.companyName} url={app.applicationUrl} className="w-8 h-8 rounded-md" />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-zinc-200 group-hover:text-white transition-colors truncate">{app.companyName}</h4>
                        <p className="text-xs text-zinc-500 truncate">{app.roleTitle}</p>
                      </div>
                      <span className="text-xs text-zinc-600 self-start">{format(new Date(app.updatedAt), 'MMM d')}</span>
                    </div>
                    
                    <div className="flex items-center justify-between mt-auto">
                      {app.salary ? (
                        <span className="text-xs font-medium text-zinc-400">{app.salary}</span>
                      ) : (
                        <span className="text-xs text-zinc-700">—</span>
                      )}
                      
                      {app.nextFollowUpDate && (
                        <span className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-sm ${
                          new Date(app.nextFollowUpDate) < new Date() 
                            ? 'bg-red-400/10 text-red-400' 
                            : 'bg-zinc-900 text-zinc-400'
                        }`}>
                          FU: {format(new Date(app.nextFollowUpDate), 'MMM d')}
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
                
                {apps.length === 0 && (
                  <div className="border border-dashed border-zinc-900 rounded-lg p-4 text-center">
                    <span className="text-xs text-zinc-600 font-medium italic">Empty</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
