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
  Link as LinkIcon,
  Sparkles,
  CheckCircle2,
  GitCommit
} from "lucide-react"
import { ApplicationStatus, TimelineEventType } from "@prisma/client"
import { CompanyLogo, ContactAvatar } from "@/components/ui/avatars"
import { ApplicationActions } from "@/components/ui/application-actions"
import { AddTimelineEventModal } from "@/components/ui/add-timeline-event-modal"

export const dynamic = 'force-dynamic'

function StatusBadge({ status }: { status: ApplicationStatus }) {
  const statusConfig: Record<ApplicationStatus, { badge: string; dot: string }> = {
    SAVED: { badge: 'text-zinc-400 border-zinc-800 bg-zinc-900', dot: 'bg-zinc-500' },
    APPLIED: { badge: 'text-blue-400 border-blue-500/30 bg-blue-950/40', dot: 'bg-blue-400' },
    CONTACTED: { badge: 'text-purple-400 border-purple-500/30 bg-purple-950/40', dot: 'bg-purple-400' },
    SCREENING: { badge: 'text-amber-400 border-amber-500/30 bg-amber-950/40', dot: 'bg-amber-400' },
    INTERVIEW: { badge: 'text-orange-400 border-orange-500/30 bg-orange-950/40', dot: 'bg-orange-400' },
    ASSIGNMENT: { badge: 'text-indigo-400 border-indigo-500/30 bg-indigo-950/40', dot: 'bg-indigo-400' },
    OFFER: { badge: 'text-emerald-400 border-emerald-500/30 bg-emerald-950/40', dot: 'bg-emerald-400' },
    ACCEPTED: { badge: 'text-emerald-400 border-emerald-500/30 bg-emerald-950/40', dot: 'bg-emerald-400' },
    REJECTED: { badge: 'text-rose-400 border-rose-500/30 bg-rose-950/40', dot: 'bg-rose-400' },
    GHOSTED: { badge: 'text-zinc-400 border-zinc-800 bg-zinc-900', dot: 'bg-zinc-500' },
    WITHDRAWN: { badge: 'text-zinc-500 border-zinc-800 bg-zinc-900', dot: 'bg-zinc-500' },
  }

  const config = statusConfig[status] || statusConfig.SAVED

  return (
    <span className={`inline-flex items-center justify-center gap-2 h-8 px-3 text-xs font-semibold uppercase tracking-wider border rounded-xl ${config.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      <span>{status.replace('_', ' ')}</span>
    </span>
  )
}

function formatEventType(type: TimelineEventType | string): string {
  switch (type) {
    case 'STATUS_CHANGE':
      return 'Status Changed'
    case 'FOLLOW_UP':
      return 'Follow-up Scheduled'
    case 'NOTE_ADDED':
      return 'Note Logged'
    default:
      return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
  }
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
              <span className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-zinc-500" /> Type
              </span>
              <span className="text-sm font-medium text-zinc-200">{application.jobType.replace('_', ' ')}</span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-zinc-500" /> Location
              </span>
              <span className="text-sm font-medium text-zinc-200">
                {application.location || application.workplaceType}
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-zinc-500" /> Target Salary
              </span>
              <span className="text-sm font-medium text-zinc-200">{application.salary || '—'}</span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-zinc-500" /> Last Updated
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
                <h3 className="text-xs font-semibold text-zinc-300">Notes & Strategy</h3>
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
                  <span className="text-xs text-zinc-400 block">Resume Version</span>
                  <span className="text-xs font-medium text-zinc-200">{application.resumeVersion || 'Default'}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400">
                  <FileCode className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs text-zinc-400 block">Portfolio Version</span>
                  <span className="text-xs font-medium text-zinc-200">{application.portfolioVersion || 'Default'}</span>
                </div>
              </div>
            </section>
          )}

        </div>

        {/* ================= RIGHT SIDEBAR SECTION (1/3) ================= */}
        <div className="space-y-6">
          
          {/* Follow-up Reminder Card */}
          <section className="p-5 rounded-2xl bg-zinc-950/60 border border-zinc-900 space-y-3">
            <h3 className="text-xs font-semibold text-zinc-300">Follow-up</h3>
            {application.nextFollowUpDate ? (
              <div className="space-y-2">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-zinc-500">Next Scheduled For</span>
                  <span className={`text-sm font-semibold ${
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
            <h3 className="text-xs font-semibold text-zinc-300">Recruiter / Contact</h3>
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

          {/* Timeline & Activity Feed (No hanging line) */}
          <section className="p-5 rounded-2xl bg-zinc-950/60 border border-zinc-900 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-zinc-400" />
                <h3 className="text-xs font-semibold text-zinc-300">Activity Timeline</h3>
              </div>
              <AddTimelineEventModal applicationId={application.id} />
            </div>
            
            <div className="pt-2">
              {application.timelineEvents.length === 0 ? (
                <p className="text-xs text-zinc-600 italic py-2">No timeline events recorded yet.</p>
              ) : (
                <div className="space-y-0">
                  {application.timelineEvents.map((event, index) => {
                    const isLast = index === application.timelineEvents.length - 1
                    return (
                      <div key={event.id} className="relative flex gap-3 pb-6 last:pb-0">
                        {/* Connecting vertical line (only extends to next node, never below the last node) */}
                        {!isLast && (
                          <div className="absolute left-[7px] top-3.5 bottom-0 w-px bg-zinc-800" />
                        )}

                        {/* Node Dot */}
                        <div className="relative z-10 w-3.5 h-3.5 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center shrink-0 mt-0.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                        </div>

                        {/* Event Content */}
                        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="text-xs font-medium text-zinc-200">
                              {formatEventType(event.eventType)}
                            </span>
                            <span className="text-[10px] text-zinc-500 font-mono shrink-0">
                              {format(new Date(event.date), 'MMM d, yyyy')}
                            </span>
                          </div>
                          {event.description && (
                            <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
                              {event.description}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </section>

        </div>

      </div>
    </div>
  )
}
