import { prisma } from "@/lib/prisma"
import { format, isPast, isToday } from "date-fns"
import { notFound } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  ExternalLink,
  Calendar,
  MapPin,
  Briefcase,
  DollarSign,
  User as UserIcon,
  Mail,
  FileText,
  Clock,
  FileCode,
  Link as LinkIcon
} from "lucide-react"
import { ApplicationStatus } from "@prisma/client"
import { CompanyLogo, ContactAvatar } from "@/components/ui/avatars"
import { ApplicationActions } from "@/components/ui/application-actions"
import { AddTimelineEventModal } from "@/components/ui/add-timeline-event-modal"

export const dynamic = 'force-dynamic'

function StatusBadge({ status }: { status: ApplicationStatus }) {
  const statusConfig: Record<ApplicationStatus, string> = {
    SAVED: 'text-zinc-500 border-zinc-800 bg-zinc-900/60',
    APPLIED: 'text-blue-400 border-blue-400/20 bg-blue-950/40',
    CONTACTED: 'text-purple-400 border-purple-400/20 bg-purple-950/40',
    SCREENING: 'text-amber-400 border-amber-400/20 bg-amber-950/40',
    INTERVIEW: 'text-orange-400 border-orange-400/20 bg-orange-950/40',
    ASSIGNMENT: 'text-indigo-400 border-indigo-400/20 bg-indigo-950/40',
    OFFER: 'text-emerald-400 border-emerald-400/20 bg-emerald-950/40',
    ACCEPTED: 'text-emerald-500 border-emerald-500/20 bg-emerald-950/40',
    REJECTED: 'text-red-400 border-red-400/20 bg-red-950/40',
    GHOSTED: 'text-zinc-500 border-zinc-800 bg-zinc-900/60',
    WITHDRAWN: 'text-zinc-500 border-zinc-800 bg-zinc-900/60',
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
    <div className="max-w-5xl space-y-10 pb-24">
      {/* Back Navigation */}
      <div>
        <Link 
          href="/applications" 
          className="text-zinc-500 hover:text-zinc-200 inline-flex items-center gap-2 text-sm transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back to applications</span>
        </Link>
      </div>

      {/* Header Banner */}
      <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-2">
        <div className="flex gap-4 items-center">
          <CompanyLogo name={application.companyName} url={application.applicationUrl} className="w-14 h-14 rounded-2xl shrink-0" />
          <div>
            <h1 className="text-3xl sm:text-4xl font-light tracking-tight text-white mb-1">
              {application.companyName}
            </h1>
            <h2 className="text-lg text-zinc-400 font-medium">
              {application.roleTitle}
            </h2>
          </div>
        </div>

        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-3">
          <div className="flex items-center gap-2">
            <StatusBadge status={application.status} />
            <ApplicationActions application={application} />
          </div>
          <span className="text-xs text-zinc-500 font-medium">
            {application.dateApplied 
              ? `Applied on ${format(new Date(application.dateApplied), 'MMM d, yyyy')}` 
              : 'Draft / Saved'}
          </span>
        </div>
      </header>

      {/* Main Grid: Left 2 Cols (Details & Notes) vs Right 1 Col (Follow-up, Contact, Timeline) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 border-t border-zinc-900 pt-8">
        
        {/* ================= LEFT MAIN SECTION (2/3) ================= */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Key Attributes Overview */}
          <section className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 rounded-2xl bg-zinc-950/60 border border-zinc-900">
            <div className="flex flex-col gap-1">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-zinc-500 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-zinc-400" /> Type
              </span>
              <span className="text-sm font-medium text-zinc-200">{application.jobType.replace('_', ' ')}</span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-zinc-500 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-zinc-400" /> Location
              </span>
              <span className="text-sm font-medium text-zinc-200">
                {application.location || application.workplaceType}
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-zinc-500 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-zinc-400" /> Salary
              </span>
              <span className="text-sm font-medium text-zinc-200">{application.salary || '—'}</span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-zinc-500 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-zinc-400" /> Updated
              </span>
              <span className="text-sm font-medium text-zinc-200">{format(new Date(application.updatedAt), 'MMM d')}</span>
            </div>
          </section>

          {/* External Links */}
          {(application.applicationUrl || application.jobDescriptionUrl) && (
            <section className="flex flex-wrap gap-3">
              {application.applicationUrl && (
                <a 
                  href={application.applicationUrl} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Job Application Portal</span>
                </a>
              )}
              {application.jobDescriptionUrl && (
                <a 
                  href={application.jobDescriptionUrl} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-300 hover:text-white transition-colors"
                >
                  <LinkIcon className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Job Description Link</span>
                </a>
              )}
            </section>
          )}

          {/* Notes & Strategy (Prominent Main Area) */}
          <section className="p-6 rounded-2xl bg-zinc-950/60 border border-zinc-900 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-900/80 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-zinc-400" />
                <h3 className="text-xs uppercase tracking-wider font-semibold text-zinc-400">Notes & Strategy</h3>
              </div>
            </div>

            {application.notes ? (
              <div className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap font-normal">
                {application.notes}
              </div>
            ) : (
              <p className="text-sm text-zinc-600 italic">No notes or strategy added for this application yet.</p>
            )}
          </section>

          {/* Document Versions */}
          {(application.resumeVersion || application.portfolioVersion) && (
            <section className="grid grid-cols-2 gap-4 p-5 rounded-2xl bg-zinc-950/60 border border-zinc-900">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-zinc-500 block">Resume Version</span>
                  <span className="text-xs font-medium text-zinc-200">{application.resumeVersion || 'Default'}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400">
                  <FileCode className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-zinc-500 block">Portfolio Version</span>
                  <span className="text-xs font-medium text-zinc-200">{application.portfolioVersion || 'Default'}</span>
                </div>
              </div>
            </section>
          )}

        </div>

        {/* ================= RIGHT SIDEBAR SECTION (1/3) ================= */}
        <div className="space-y-6">
          
          {/* Follow-up Reminder Card */}
          <section className="p-5 rounded-2xl bg-zinc-950/60 border border-zinc-900 space-y-4">
            <h3 className="text-xs uppercase tracking-wider font-semibold text-zinc-500">Follow-up</h3>
            {application.nextFollowUpDate ? (
              <div className="space-y-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-zinc-500">Next Scheduled For</span>
                  <span className={`text-base font-semibold ${
                    isPast(new Date(application.nextFollowUpDate)) && !isToday(new Date(application.nextFollowUpDate))
                      ? 'text-red-400'
                      : isToday(new Date(application.nextFollowUpDate))
                      ? 'text-amber-400'
                      : 'text-zinc-200'
                  }`}>
                    {format(new Date(application.nextFollowUpDate), 'MMMM d, yyyy')}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-zinc-500">No follow-up scheduled.</p>
            )}
          </section>

          {/* Contact Information */}
          <section className="p-5 rounded-2xl bg-zinc-950/60 border border-zinc-900 space-y-3">
            <h3 className="text-xs uppercase tracking-wider font-semibold text-zinc-500">Recruiter / Contact</h3>
            {application.contactName ? (
              <div className="flex items-start gap-3 pt-1">
                <ContactAvatar name={application.contactName} className="w-9 h-9 mt-0.5 shrink-0" />
                <div className="flex flex-col gap-1 min-w-0">
                  <span className="text-sm font-semibold text-zinc-200 truncate">{application.contactName}</span>
                  {application.contactRole && (
                    <span className="text-xs text-zinc-400 truncate">{application.contactRole}</span>
                  )}
                  {application.contactEmail && (
                    <a 
                      href={`mailto:${application.contactEmail}`} 
                      className="text-xs text-zinc-400 hover:text-white flex items-center gap-1.5 transition-colors truncate pt-1"
                    >
                      <Mail className="w-3 h-3 text-zinc-500" /> {application.contactEmail}
                    </a>
                  )}
                  {application.contactUrl && (
                    <a 
                      href={application.contactUrl} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1.5 transition-colors pt-0.5"
                    >
                      <ExternalLink className="w-3 h-3" /> Profile / LinkedIn
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-zinc-600 italic">No contact added.</p>
            )}
          </section>

          {/* Timeline & Activity Feed (Compact & Functional in Sidebar) */}
          <section className="p-5 rounded-2xl bg-zinc-950/60 border border-zinc-900 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-zinc-400" />
                <h3 className="text-xs uppercase tracking-wider font-semibold text-zinc-400">Activity Timeline</h3>
              </div>
              <AddTimelineEventModal applicationId={application.id} />
            </div>
            
            <div className="pt-2">
              {application.timelineEvents.length === 0 ? (
                <p className="text-xs text-zinc-600 italic py-2">No timeline events recorded yet.</p>
              ) : (
                <div className="relative border-l border-zinc-800 ml-2 space-y-6">
                  {application.timelineEvents.map((event) => (
                    <div key={event.id} className="relative pl-4">
                      <div className="absolute w-2 h-2 bg-zinc-500 rounded-full -left-[4.5px] top-1 ring-4 ring-black" />
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-mono text-zinc-500">
                          {format(new Date(event.date), 'MMM d, yyyy')}
                        </span>
                        <span className="text-xs font-semibold text-zinc-200">
                          {event.eventType.replace('_', ' ')}
                        </span>
                        {event.description && (
                          <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
                            {event.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

        </div>

      </div>
    </div>
  )
}
