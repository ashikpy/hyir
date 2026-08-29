import { prisma } from '@/lib/prisma'
import { TriageView, TriageApp } from '@/components/ui/triage-view'
import { Inbox } from 'lucide-react'

import { requireUser } from '@/lib/auth-helpers'

export const dynamic = 'force-dynamic'

export default async function TriagePage() {
  const user = await requireUser()
  const applications = await prisma.application.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      slug: true,
      companyName: true,
      roleTitle: true,
      status: true,
      jobType: true,
      workplaceType: true,
      location: true,
      salary: true,
      applicationUrl: true,
      contactName: true,
      contactEmail: true,
      contactRole: true,
      notes: true,
      resumeVersion: true,
      portfolioVersion: true,
      dateApplied: true,
      nextFollowUpDate: true,
      updatedAt: true,
      timelineEvents: {
        select: {
          date: true,
          eventType: true,
        },
        orderBy: { date: 'desc' },
        take: 1,
      },
    },
    orderBy: { updatedAt: 'desc' },
  })

  return (
    <div className="flex flex-col h-full space-y-6">
      <header className="shrink-0 space-y-1">
        <h1 className="text-4xl font-light tracking-tight text-white flex items-center gap-3">
          Triage
        </h1>
        <p className="text-sm text-zinc-400 font-normal">
          Complete unfinished drafts, fill missing links, and polish your application pipeline.
        </p>
      </header>

      {/* Interactive Triage Auditor */}
      <TriageView applications={applications as TriageApp[]} />
    </div>
  )
}
