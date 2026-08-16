import { prisma } from "@/lib/prisma"
import { format, isPast, isToday } from "date-fns"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, ExternalLink, Calendar, MapPin, Briefcase, DollarSign, User as UserIcon, Mail } from "lucide-react"
import { ApplicationStatus, TimelineEventType } from "@prisma/client"
import { CompanyLogo, ContactAvatar } from "@/components/ui/avatars"
import { ApplicationActions } from "@/components/ui/application-actions"

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
    <span className={`text-[10px] uppercase tracking-wider font-semibold px-3 py-1 border rounded-full ${config}`}>
      {status.replace('_', ' ')}
    </span>
  )
}

export default async function ApplicationDetailPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const application = await prisma.application.findUnique({
    where: { slug: params.slug },
    include: {
      timelineEvents: {
        orderBy: { date: 'desc' }
      }
    }
  })

  if (!application) {
    notFound()
  }

  return (
    <div className="max-w-4xl space-y-12 pb-20">
      {/* Back Link */}
      <div>
        <Link href="/applications" className="text-zinc-500 hover:text-white flex items-center gap-2 text-sm transition-colors w-fit">
          <ArrowLeft className="w-4 h-4" /> Back to applications
        </Link>
      </div>

      {/* Header */}
      <header className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-4 items-center">
            <CompanyLogo name={application.companyName} url={application.applicationUrl} className="w-12 h-12 rounded-xl" />
            <div>
              <h1 className="text-4xl font-light tracking-tight mb-2">{application.companyName}</h1>
              <h2 className="text-xl text-zinc-400 font-medium">{application.roleTitle}</h2>
            </div>
          </div>
          <div className="flex flex-col items-end gap-3">
            <StatusBadge status={application.status} />
            <ApplicationActions application={application} />
            <span className="text-sm text-zinc-500">
              {application.dateApplied ? `Applied ${format(new Date(application.dateApplied), 'MMM d, yyyy')}` : 'Not yet applied'}
            </span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-12 border-t border-zinc-900 pt-12">
        
        {/* Main Column */}
        <div className="md:col-span-2 space-y-12">
          
          {/* Overview */}
          <section className="grid grid-cols-2 gap-y-6 gap-x-4">
            <div className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-widest font-semibold text-zinc-600 flex items-center gap-1.5"><Briefcase className="w-3 h-3" /> Type</span>
              <span className="text-sm text-zinc-200">{application.jobType.replace('_', ' ')}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-widest font-semibold text-zinc-600 flex items-center gap-1.5"><MapPin className="w-3 h-3" /> Location</span>
              <span className="text-sm text-zinc-200">{application.workplaceType} {application.location && `· ${application.location}`}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-widest font-semibold text-zinc-600 flex items-center gap-1.5"><DollarSign className="w-3 h-3" /> Salary</span>
              <span className="text-sm text-zinc-200">{application.salary || '—'}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-widest font-semibold text-zinc-600 flex items-center gap-1.5"><Calendar className="w-3 h-3" /> Updated</span>
              <span className="text-sm text-zinc-200">{format(new Date(application.updatedAt), 'MMM d, yyyy')}</span>
            </div>
          </section>

          {/* Links */}
          {(application.applicationUrl || application.jobDescriptionUrl) && (
            <section className="flex gap-4 border-t border-zinc-900 pt-8">
              {application.applicationUrl && (
                <a href={application.applicationUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
                  <ExternalLink className="w-4 h-4" /> Application portal
                </a>
              )}
              {application.jobDescriptionUrl && (
                <a href={application.jobDescriptionUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-300 transition-colors">
                  <ExternalLink className="w-4 h-4" /> Job description
                </a>
              )}
            </section>
          )}

          {/* Timeline */}
          <section className="border-t border-zinc-900 pt-8">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-medium tracking-tight">Timeline</h3>
              <button className="text-xs font-medium text-zinc-400 hover:text-white transition-colors">Add event</button>
            </div>
            
            <div className="space-y-6">
              {application.timelineEvents.length === 0 ? (
                <p className="text-sm text-zinc-500 italic">No timeline events yet.</p>
              ) : (
                <div className="relative border-l border-zinc-800 ml-3 space-y-8">
                  {application.timelineEvents.map((event, index) => (
                    <div key={event.id} className="relative pl-6">
                      <div className="absolute w-2 h-2 bg-zinc-700 rounded-full -left-[5px] top-1.5 ring-4 ring-black" />
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-zinc-500">{format(new Date(event.date), 'MMM d, yyyy')}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-zinc-200">{event.eventType.replace('_', ' ')}</span>
                        </div>
                        {event.description && <p className="text-sm text-zinc-400 mt-1">{event.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

        </div>

        {/* Sidebar Column */}
        <div className="space-y-12">
          
          {/* Follow-up */}
          <section className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-xs uppercase tracking-widest font-semibold text-zinc-500 mb-4">Follow-up</h3>
            {application.nextFollowUpDate ? (
              <div className="space-y-4">
                <div className="flex flex-col gap-1">
                  <span className="text-sm text-zinc-400">Next scheduled for</span>
                  <span className={`text-lg font-medium ${
                    isPast(new Date(application.nextFollowUpDate)) && !isToday(new Date(application.nextFollowUpDate))
                      ? 'text-red-400'
                      : isToday(new Date(application.nextFollowUpDate))
                      ? 'text-amber-400'
                      : 'text-zinc-200'
                  }`}>
                    {format(new Date(application.nextFollowUpDate), 'MMMM d, yyyy')}
                  </span>
                </div>
                <button className="w-full bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium py-2 rounded-md transition-colors">
                  Complete follow-up
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-zinc-500">No follow-up scheduled.</p>
                <button className="w-full border border-zinc-700 hover:bg-zinc-800 text-zinc-300 text-sm font-medium py-2 rounded-md transition-colors">
                  Schedule follow-up
                </button>
              </div>
            )}
          </section>

          {/* Contact */}
          <section>
            <h3 className="text-xs uppercase tracking-widest font-semibold text-zinc-500 mb-4">Contact</h3>
            {application.contactName ? (
              <div className="flex gap-4">
                <ContactAvatar name={application.contactName} className="w-10 h-10 mt-1" />
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-zinc-200">{application.contactName}</span>
                  {application.contactRole && <span className="text-sm text-zinc-500">{application.contactRole}</span>}
                  {application.contactEmail && (
                    <a href={`mailto:${application.contactEmail}`} className="text-sm text-zinc-400 hover:text-white flex items-center gap-2 transition-colors">
                      <Mail className="w-3 h-3" /> {application.contactEmail}
                    </a>
                  )}
                  {application.contactUrl && (
                    <a href={application.contactUrl} target="_blank" rel="noreferrer" className="text-sm text-zinc-400 hover:text-white flex items-center gap-2 transition-colors">
                      <ExternalLink className="w-3 h-3" /> Profile
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-zinc-600">No contact information added.</p>
            )}
            <button className="text-xs font-medium text-zinc-500 hover:text-white mt-4 transition-colors">Edit contact</button>
          </section>

          {/* Notes */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs uppercase tracking-widest font-semibold text-zinc-500">Notes</h3>
              <button className="text-xs font-medium text-zinc-500 hover:text-white transition-colors">Edit</button>
            </div>
            {application.notes ? (
              <div className="prose prose-invert prose-sm text-zinc-400 leading-relaxed whitespace-pre-wrap">
                {application.notes}
              </div>
            ) : (
              <p className="text-sm text-zinc-600 italic">No notes added.</p>
            )}
          </section>
        </div>

      </div>
    </div>
  )
}
