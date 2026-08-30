'use server'

import { prisma } from '@/lib/prisma'
import { ApplicationStatus, TimelineEventType, JobType, WorkplaceType } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { requireUser, getCurrentUser } from '@/lib/auth-helpers'
import { buildGoogleCalendarUrl, createGoogleCalendarApiEvent } from '@/lib/google-calendar'
import { fetchRecentJobEmails } from '@/lib/gmail'
import { parseJobEmailWithAI, ParsedJobUpdate } from '@/lib/email-parser'

export async function createApplication(formData: FormData) {
  const companyName = formData.get('companyName') as string
  const roleTitle = formData.get('roleTitle') as string
  const status = formData.get('status') as ApplicationStatus
  const dateApplied = formData.get('dateApplied') as string
  const applicationUrl = formData.get('applicationUrl') as string
  const jobDescriptionUrl = formData.get('jobDescriptionUrl') as string
  const jobType = (formData.get('jobType') as any) || 'FULL_TIME'
  const workplaceType = (formData.get('workplaceType') as any) || 'REMOTE'
  const salary = formData.get('salary') as string
  const location = formData.get('location') as string
  const contactName = formData.get('contactName') as string
  const contactEmail = formData.get('contactEmail') as string
  const contactRole = formData.get('contactRole') as string
  const contactUrl = formData.get('contactUrl') as string
  const notes = formData.get('notes') as string
  const resumeVersion = formData.get('resumeVersion') as string
  const portfolioVersion = formData.get('portfolioVersion') as string
  const nextFollowUpDate = formData.get('nextFollowUpDate') as string

  if (!companyName || !roleTitle) {
    throw new Error('Company name and role title are required')
  }

  const user = await requireUser()

  const baseSlug = `${companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${roleTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
  const existing = await prisma.application.count({ where: { slug: { startsWith: baseSlug } } })
  const slug = existing > 0 ? `${baseSlug}-${existing + 1}` : baseSlug

  const created = await prisma.application.create({
    data: {
      userId: user.id,
      slug,
      companyName,
      roleTitle,
      status: status || 'SAVED',
      jobType,
      workplaceType,
      dateApplied: dateApplied ? new Date(dateApplied) : null,
      applicationUrl: applicationUrl || null,
      jobDescriptionUrl: jobDescriptionUrl || null,
      salary: salary || null,
      location: location || null,
      contactName: contactName || null,
      contactEmail: contactEmail || null,
      contactRole: contactRole || null,
      contactUrl: contactUrl || null,
      notes: notes || null,
      resumeVersion: resumeVersion || null,
      portfolioVersion: portfolioVersion || null,
      nextFollowUpDate: nextFollowUpDate ? new Date(nextFollowUpDate) : null,
    }
  })

  revalidatePath('/')
  revalidatePath('/applications')
  revalidatePath('/pipeline')
  return created.slug
}

export async function updateApplication(id: string, formData: FormData) {
  const current = await prisma.application.findUnique({
    where: { id },
    select: {
      status: true,
      contactName: true,
      contactEmail: true,
      salary: true,
      slug: true,
    }
  })

  if (!current) throw new Error('Application not found')

  const companyName = formData.get('companyName') as string
  const roleTitle = formData.get('roleTitle') as string
  const status = formData.get('status') as ApplicationStatus
  const jobType = (formData.get('jobType') as string) || 'FULL_TIME'
  const workplaceType = (formData.get('workplaceType') as string) || 'REMOTE'
  const location = formData.get('location') as string
  const dateApplied = formData.get('dateApplied') as string
  const applicationUrl = formData.get('applicationUrl') as string
  const salary = (formData.get('salary') as string)?.trim() || null
  const contactName = (formData.get('contactName') as string)?.trim() || null
  const contactEmail = (formData.get('contactEmail') as string)?.trim() || null
  const contactRole = (formData.get('contactRole') as string)?.trim() || null
  const contactUrl = (formData.get('contactUrl') as string)?.trim() || null
  const notes = (formData.get('notes') as string)?.trim() || null

  if (!companyName || !roleTitle) {
    throw new Error('Company name and role title are required')
  }

  const baseSlug = `${companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${roleTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
  const existing = await prisma.application.findFirst({ where: { slug: { startsWith: baseSlug }, NOT: { id } } })
  const slug = existing ? `${baseSlug}-${Math.floor(Math.random() * 1000)}` : baseSlug

  const timelineEventsToCreate: Array<{ eventType: TimelineEventType; description: string; date: Date }> = []
  const now = new Date()

  // 1. Status change
  if (status && status !== current.status) {
    timelineEventsToCreate.push({
      eventType: 'STATUS_CHANGE',
      date: now,
      description: `Stage moved from ${current.status.replace('_', ' ')} to ${status.replace('_', ' ')}`
    })
  }

  // 2. Recruiter / Contact
  const prevContactName = current.contactName?.trim() || null
  const prevContactEmail = current.contactEmail?.trim() || null

  if (
    (contactName !== prevContactName || contactEmail !== prevContactEmail) &&
    (contactName || contactEmail)
  ) {
    if (contactName?.toLowerCase() === 'no direct contact') {
      timelineEventsToCreate.push({
        eventType: 'CUSTOM',
        date: now,
        description: `Marked as No Direct Contact`
      })
    } else if (!prevContactName && !prevContactEmail) {
      timelineEventsToCreate.push({
        eventType: 'CUSTOM',
        date: now,
        description: `Added recruiter ${contactName || ''}${contactEmail ? ` (${contactEmail})` : ''}`.trim()
      })
    } else {
      timelineEventsToCreate.push({
        eventType: 'CUSTOM',
        date: now,
        description: `Updated recruiter to ${contactName || 'contact'}${contactEmail ? ` (${contactEmail})` : ''}`.trim()
      })
    }
  }

  // 3. Salary
  const prevSalary = current.salary?.trim() || null
  if (salary !== prevSalary && salary) {
    if (salary.toLowerCase() === 'not disclosed') {
      timelineEventsToCreate.push({
        eventType: 'CUSTOM',
        date: now,
        description: `Target salary marked as Not Disclosed`
      })
    } else {
      timelineEventsToCreate.push({
        eventType: 'CUSTOM',
        date: now,
        description: !prevSalary
          ? `Set target salary to ${salary}`
          : `Updated target salary to ${salary}`
      })
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const res = await tx.application.update({
      where: { id },
      data: {
        slug,
        companyName,
        roleTitle,
        status: status || 'SAVED',
        jobType: (jobType as JobType),
        workplaceType: (workplaceType as WorkplaceType),
        location: location || null,
        dateApplied: dateApplied ? new Date(dateApplied) : null,
        applicationUrl: applicationUrl || null,
        salary: salary || null,
        contactName: contactName || null,
        contactEmail: contactEmail || null,
        contactRole: contactRole || null,
        contactUrl: contactUrl || null,
        notes: notes || null,
      }
    })

    for (const evt of timelineEventsToCreate) {
      await tx.timelineEvent.create({
        data: {
          applicationId: id,
          eventType: evt.eventType,
          date: evt.date,
          description: evt.description,
        }
      })
    }

    return res
  })

  revalidatePath('/')
  revalidatePath('/applications')
  revalidatePath('/pipeline')
  revalidatePath('/triage')
  revalidatePath(`/applications/${slug}`)
  
  return updated.slug
}

export async function quickUpdateTriageField(
  id: string,
  data: {
    applicationUrl?: string | null
    contactName?: string | null
    contactEmail?: string | null
    salary?: string | null
    notes?: string | null
    status?: ApplicationStatus
    dateApplied?: string | Date | null
  }
) {
  const current = await prisma.application.findUnique({
    where: { id },
    select: {
      status: true,
      contactName: true,
      contactEmail: true,
      salary: true,
      slug: true,
    }
  })

  if (!current) throw new Error('Application not found')

  const updateData: any = { ...data }
  if ('dateApplied' in data) {
    updateData.dateApplied = data.dateApplied ? new Date(data.dateApplied) : null
  }

  const timelineEventsToCreate: Array<{ eventType: TimelineEventType; description: string; date: Date }> = []
  const now = new Date()

  // 1. Status change
  if (data.status && data.status !== current.status) {
    timelineEventsToCreate.push({
      eventType: 'STATUS_CHANGE',
      date: now,
      description: `Stage moved from ${current.status.replace('_', ' ')} to ${data.status.replace('_', ' ')}`
    })
  }

  // 2. Recruiter / Contact
  const newContactName = data.contactName !== undefined ? (data.contactName?.trim() || null) : current.contactName
  const newContactEmail = data.contactEmail !== undefined ? (data.contactEmail?.trim() || null) : current.contactEmail
  const prevContactName = current.contactName?.trim() || null
  const prevContactEmail = current.contactEmail?.trim() || null

  if (
    (newContactName !== prevContactName || newContactEmail !== prevContactEmail) &&
    (newContactName || newContactEmail)
  ) {
    if (newContactName?.toLowerCase() === 'no direct contact') {
      timelineEventsToCreate.push({
        eventType: 'CUSTOM',
        date: now,
        description: `Marked as No Direct Contact`
      })
    } else if (!prevContactName && !prevContactEmail) {
      timelineEventsToCreate.push({
        eventType: 'CUSTOM',
        date: now,
        description: `Added recruiter ${newContactName || ''}${newContactEmail ? ` (${newContactEmail})` : ''}`.trim()
      })
    } else {
      timelineEventsToCreate.push({
        eventType: 'CUSTOM',
        date: now,
        description: `Updated recruiter to ${newContactName || 'contact'}${newContactEmail ? ` (${newContactEmail})` : ''}`.trim()
      })
    }
  }

  // 3. Target Salary
  const newSalary = data.salary !== undefined ? (data.salary?.trim() || null) : current.salary
  const prevSalary = current.salary?.trim() || null

  if (newSalary !== prevSalary && newSalary) {
    if (newSalary.toLowerCase() === 'not disclosed') {
      timelineEventsToCreate.push({
        eventType: 'CUSTOM',
        date: now,
        description: `Target salary marked as Not Disclosed`
      })
    } else {
      timelineEventsToCreate.push({
        eventType: 'CUSTOM',
        date: now,
        description: !prevSalary
          ? `Set target salary to ${newSalary}`
          : `Updated target salary to ${newSalary}`
      })
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const res = await tx.application.update({
      where: { id },
      data: updateData,
    })

    for (const evt of timelineEventsToCreate) {
      await tx.timelineEvent.create({
        data: {
          applicationId: id,
          eventType: evt.eventType,
          date: evt.date,
          description: evt.description,
        }
      })
    }

    return res
  })

  revalidatePath('/')
  revalidatePath('/applications')
  revalidatePath('/pipeline')
  revalidatePath('/triage')
  revalidatePath(`/applications/${updated.slug}`)

  return updated
}

export async function updateApplicationStatus(id: string, newStatus: ApplicationStatus) {
  const current = await prisma.application.findUnique({
    where: { id },
    select: { status: true, companyName: true, roleTitle: true, slug: true }
  })

  if (!current) throw new Error('Application not found')
  if (current.status === newStatus) return

  await prisma.$transaction([
    prisma.application.update({
      where: { id },
      data: { status: newStatus }
    }),
    prisma.timelineEvent.create({
      data: {
        applicationId: id,
        eventType: 'STATUS_CHANGE',
        date: new Date(),
        description: `Stage moved from ${current.status.replace('_', ' ')} to ${newStatus.replace('_', ' ')}`
      }
    })
  ])

  try {
    revalidatePath('/')
    revalidatePath('/applications')
    revalidatePath('/pipeline')
    revalidatePath('/analytics')
    revalidatePath('/follow-ups')
    revalidatePath('/triage')
    if (current.slug) {
      revalidatePath(`/applications/${current.slug}`)
    }
  } catch {
    // Ignore outside Next request lifecycle
  }
}

export async function addTimelineEvent(applicationId: string, formData: FormData) {
  const eventType = formData.get('eventType') as TimelineEventType
  const date = formData.get('date') as string
  const description = formData.get('description') as string

  await prisma.timelineEvent.create({
    data: {
      applicationId,
      eventType: eventType || 'CUSTOM',
      date: date ? new Date(date) : new Date(),
      description: description || null,
    }
  })

  revalidatePath('/')
  revalidatePath('/applications')
  revalidatePath('/pipeline')
  revalidatePath('/follow-ups')
}

export async function updateApplicationNotes(id: string, notes: string) {
  const updated = await prisma.application.update({
    where: { id },
    data: { notes: notes.trim() ? notes : null },
    select: { slug: true }
  })

  try {
    revalidatePath('/')
    revalidatePath('/applications')
    revalidatePath('/pipeline')
    revalidatePath('/triage')
    if (updated.slug) {
      revalidatePath(`/applications/${updated.slug}`)
    }
  } catch {
    // Ignore outside Next request lifecycle
  }

  return updated
}

export async function updateDocuments(applicationId: string, formData: FormData) {
  const resumeVersion = formData.get('resumeVersion') as string
  const portfolioVersion = formData.get('portfolioVersion') as string

  await prisma.application.update({
    where: { id: applicationId },
    data: {
      resumeVersion: resumeVersion || null,
      portfolioVersion: portfolioVersion || null,
    }
  })

  revalidatePath('/')
  revalidatePath('/applications')
  revalidatePath('/pipeline')
}

export async function deleteApplication(id: string) {
  await prisma.application.delete({
    where: { id }
  })
  
  revalidatePath('/')
  revalidatePath('/applications')
  revalidatePath('/pipeline')
}

export async function exportApplicationsData() {
  const user = await requireUser()
  const applications = await prisma.application.findMany({
    where: { userId: user.id },
    include: {
      timelineEvents: {
        orderBy: { date: 'asc' }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  return applications.map(app => ({
    id: app.id,
    companyName: app.companyName,
    roleTitle: app.roleTitle,
    status: app.status,
    jobType: app.jobType,
    workplaceType: app.workplaceType,
    location: app.location,
    salary: app.salary,
    dateApplied: app.dateApplied ? app.dateApplied.toISOString() : null,
    applicationUrl: app.applicationUrl,
    jobDescriptionUrl: app.jobDescriptionUrl,
    contactName: app.contactName,
    contactRole: app.contactRole,
    contactEmail: app.contactEmail,
    contactUrl: app.contactUrl,
    nextFollowUpDate: app.nextFollowUpDate ? app.nextFollowUpDate.toISOString() : null,
    notes: app.notes,
    resumeVersion: app.resumeVersion,
    portfolioVersion: app.portfolioVersion,
    createdAt: app.createdAt.toISOString(),
    updatedAt: app.updatedAt.toISOString(),
    timelineEvents: app.timelineEvents.map(evt => ({
      eventType: evt.eventType,
      date: evt.date.toISOString(),
      description: evt.description
    }))
  }))
}

export interface ImportPayloadRecord {
  companyName: string
  roleTitle: string
  status: ApplicationStatus
  dateApplied?: string | null
  jobType?: string
  workplaceType?: string
  location?: string | null
  salary?: string | null
  applicationUrl?: string | null
  jobDescriptionUrl?: string | null
  contactName?: string | null
  contactRole?: string | null
  contactEmail?: string | null
  contactUrl?: string | null
  nextFollowUpDate?: string | null
  notes?: string | null
  resumeVersion?: string | null
  portfolioVersion?: string | null
  timelineEvents?: Array<{
    eventType: TimelineEventType
    date: string
    description?: string | null
  }>
}

export async function importApplicationsData(
  records: ImportPayloadRecord[],
  strategy: 'skip' | 'update' | 'create_new' = 'skip'
) {
  const user = await requireUser()

  let imported = 0
  let updated = 0
  let skipped = 0
  const errors: string[] = []

  for (let i = 0; i < records.length; i++) {
    const record = records[i]
    if (!record.companyName || !record.roleTitle) {
      skipped++
      errors.push(`Row ${i + 1}: Missing company name or role title`)
      continue
    }

    try {
      const baseSlug = `${record.companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${record.roleTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`

      const existingApp = await prisma.application.findFirst({
        where: {
          userId: user.id,
          companyName: { equals: record.companyName, mode: 'insensitive' },
          roleTitle: { equals: record.roleTitle, mode: 'insensitive' }
        }
      })

      if (existingApp) {
        if (strategy === 'skip') {
          skipped++
          continue
        } else if (strategy === 'update') {
          await prisma.application.update({
            where: { id: existingApp.id },
            data: {
              status: record.status || existingApp.status,
              dateApplied: record.dateApplied ? new Date(record.dateApplied) : existingApp.dateApplied,
              location: record.location ?? existingApp.location,
              salary: record.salary ?? existingApp.salary,
              applicationUrl: record.applicationUrl ?? existingApp.applicationUrl,
              jobDescriptionUrl: record.jobDescriptionUrl ?? existingApp.jobDescriptionUrl,
              contactName: record.contactName ?? existingApp.contactName,
              contactRole: record.contactRole ?? existingApp.contactRole,
              contactEmail: record.contactEmail ?? existingApp.contactEmail,
              contactUrl: record.contactUrl ?? existingApp.contactUrl,
              nextFollowUpDate: record.nextFollowUpDate ? new Date(record.nextFollowUpDate) : existingApp.nextFollowUpDate,
              notes: record.notes !== undefined && record.notes !== null && record.notes.trim() !== '' 
                ? record.notes 
                : existingApp.notes,
              resumeVersion: record.resumeVersion ?? existingApp.resumeVersion,
              portfolioVersion: record.portfolioVersion ?? existingApp.portfolioVersion,
            }
          })

          if (record.timelineEvents && record.timelineEvents.length > 0) {
            for (const evt of record.timelineEvents) {
              await prisma.timelineEvent.create({
                data: {
                  applicationId: existingApp.id,
                  eventType: evt.eventType || 'STATUS_CHANGE',
                  date: evt.date ? new Date(evt.date) : new Date(),
                  description: evt.description || null
                }
              })
            }
          }

          updated++
          continue
        }
      }

      // Create new application
      const existingCount = await prisma.application.count({
        where: { slug: { startsWith: baseSlug } }
      })
      const slug = existingCount > 0 ? `${baseSlug}-${existingCount + 1}-${Math.floor(Math.random() * 1000)}` : baseSlug

      const newApp = await prisma.application.create({
        data: {
          userId: user.id,
          slug,
          companyName: record.companyName,
          roleTitle: record.roleTitle,
          status: record.status || 'SAVED',
          jobType: (record.jobType as any) || 'FULL_TIME',
          workplaceType: (record.workplaceType as any) || 'REMOTE',
          location: record.location || null,
          salary: record.salary || null,
          dateApplied: record.dateApplied ? new Date(record.dateApplied) : null,
          applicationUrl: record.applicationUrl || null,
          jobDescriptionUrl: record.jobDescriptionUrl || null,
          contactName: record.contactName || null,
          contactRole: record.contactRole || null,
          contactEmail: record.contactEmail || null,
          contactUrl: record.contactUrl || null,
          nextFollowUpDate: record.nextFollowUpDate ? new Date(record.nextFollowUpDate) : null,
          notes: record.notes || null,
          resumeVersion: record.resumeVersion || null,
          portfolioVersion: record.portfolioVersion || null,
        }
      })

      if (record.timelineEvents && record.timelineEvents.length > 0) {
        for (const evt of record.timelineEvents) {
          await prisma.timelineEvent.create({
            data: {
              applicationId: newApp.id,
              eventType: evt.eventType || 'STATUS_CHANGE',
              date: evt.date ? new Date(evt.date) : new Date(),
              description: evt.description || null
            }
          })
        }
      }

      imported++
    } catch (err) {
      console.error(`Error importing row ${i + 1}:`, err)
      errors.push(`Row ${i + 1} (${record.companyName}): ${err instanceof Error ? err.message : 'Unknown error'}`)
      skipped++
    }
  }

  try {
    revalidatePath('/')
    revalidatePath('/applications')
    revalidatePath('/pipeline')
    revalidatePath('/follow-ups')
    revalidatePath('/analytics')
  } catch {
    // Ignore when called outside of Next request context
  }

  return {
    total: records.length,
    imported,
    updated,
    skipped,
    errors
  }
}

export async function getSearchApplications() {
  const user = await getCurrentUser()
  if (!user) return []
  const applications = await prisma.application.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      slug: true,
      companyName: true,
      roleTitle: true,
      status: true,
      location: true,
      salary: true,
      applicationUrl: true,
      updatedAt: true,
      contactName: true,
    },
    orderBy: { updatedAt: 'desc' }
  })
  return applications
}

export async function getTriageCount(): Promise<number> {
  const user = await getCurrentUser()
  if (!user) return 0
  const apps = await prisma.application.findMany({
    where: { userId: user.id },
    select: {
      status: true,
      applicationUrl: true,
      salary: true,
      contactName: true,
      dateApplied: true,
      nextFollowUpDate: true,
    }
  })

  let count = 0
  const now = new Date()

  for (const app of apps) {
    const isDraft = (app.status as ApplicationStatus) === ApplicationStatus.SAVED
    const isOverdue =
      app.nextFollowUpDate &&
      new Date(app.nextFollowUpDate) < now &&
      app.status !== ApplicationStatus.REJECTED &&
      app.status !== ApplicationStatus.GHOSTED

    const hasIssue =
      isDraft ||
      !app.applicationUrl ||
      (!app.dateApplied && !isDraft) ||
      isOverdue ||
      (!app.contactName && !isDraft) ||
      (!app.salary || app.salary.trim() === '') ||
      (app.status === ApplicationStatus.INTERVIEW && !app.nextFollowUpDate)

    if (hasIssue) {
      count++
    }
  }

  return count
}

export async function batchTransitionToGhosted(appIds: string[]) {
  if (!appIds || appIds.length === 0) return { success: true, count: 0 }

  const now = new Date()
  await prisma.$transaction(async (tx) => {
    const apps = await tx.application.findMany({
      where: { id: { in: appIds } },
      select: { id: true, status: true, slug: true, companyName: true }
    })

    await tx.application.updateMany({
      where: { id: { in: appIds } },
      data: { status: 'GHOSTED', updatedAt: now }
    })

    for (const app of apps) {
      await tx.timelineEvent.create({
        data: {
          applicationId: app.id,
          eventType: 'STATUS_CHANGE',
          date: now,
          description: `Stage moved from ${app.status.replace('_', ' ')} to Ghosted via Triage Stale Review`
        }
      })
    }
  })

  revalidatePath('/')
  revalidatePath('/applications')
  revalidatePath('/pipeline')
  revalidatePath('/triage')
  revalidatePath('/analytics')
  revalidatePath('/follow-ups')

  return { success: true, count: appIds.length }
}

export async function snoozeStaleApplication(id: string, days: number = 14) {
  const snoozeDate = new Date()
  snoozeDate.setDate(snoozeDate.getDate() + days)

  await prisma.application.update({
    where: { id },
    data: {
      nextFollowUpDate: snoozeDate,
      updatedAt: new Date()
    }
  })

  revalidatePath('/')
  revalidatePath('/applications')
  revalidatePath('/pipeline')
  revalidatePath('/triage')

  return { success: true }
}

export async function scheduleCalendarFollowUp(
  applicationId: string,
  targetDate: string,
  options?: { timeOfDay?: string; note?: string }
) {
  const user = await requireUser()
  const app = await prisma.application.findUnique({
    where: { id: applicationId },
  })

  if (!app || app.userId !== user.id) {
    throw new Error('Application not found or unauthorized')
  }

  const followUpDateTime = new Date(targetDate)
  if (targetDate.length === 10) {
    followUpDateTime.setHours(10, 0, 0, 0)
  }

  // 1. Update application in Prisma
  await prisma.application.update({
    where: { id: applicationId },
    data: {
      nextFollowUpDate: followUpDateTime,
      updatedAt: new Date(),
    },
  })

  // 2. Log timeline event
  await prisma.timelineEvent.create({
    data: {
      applicationId,
      eventType: 'FOLLOW_UP',
      date: new Date(),
      description: `Follow-up reminder scheduled for ${followUpDateTime.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })}${options?.note ? ` · ${options.note}` : ''}`,
    },
  })

  // 3. Build Google Calendar description and URL
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/applications/${app.slug}`
    : process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}/applications/${app.slug}`
    : `http://localhost:3000/applications/${app.slug}`

  const description = [
    `Follow up on job application for ${app.roleTitle} at ${app.companyName}.`,
    app.contactName ? `\nRecruiter: ${app.contactName} ${app.contactEmail ? `(${app.contactEmail})` : ''}` : '',
    app.applicationUrl ? `\nJob Link: ${app.applicationUrl}` : '',
    `\nView in Hyir: ${appUrl}`,
    options?.note ? `\nNote: ${options.note}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  const eventParams = {
    title: `Follow up: ${app.roleTitle} @ ${app.companyName}`,
    description,
    startDate: followUpDateTime,
    durationMinutes: 30,
  }

  // Try API sync if Google token exists
  const apiSync = await createGoogleCalendarApiEvent(user.id, eventParams)

  // Generate 1-click web intent URL
  const gcalWebUrl = buildGoogleCalendarUrl(eventParams)

  revalidatePath('/')
  revalidatePath('/applications')
  revalidatePath('/pipeline')
  revalidatePath('/triage')
  revalidatePath('/follow-ups')
  revalidatePath(`/applications/${app.slug}`)

  return {
    success: true,
    gcalWebUrl,
    apiSynced: apiSync.success,
    followUpDate: followUpDateTime.toISOString(),
  }
}

export interface SyncInboxResultItem {
  id: string
  companyName: string
  roleTitle?: string | null
  status: ApplicationStatus
  previousStatus?: ApplicationStatus | null
  summary: string
  isNew: boolean
  interviewScheduled: boolean
  originalSubject: string
  date: string
}

export interface SyncInboxResponse {
  success: boolean
  error?: string
  totalScanned: number
  jobRelatedCount: number
  updatedCount: number
  createdCount: number
  items: SyncInboxResultItem[]
}

export async function checkGmailConnectionStatus(): Promise<{
  isConnected: boolean
  email?: string
}> {
  const user = await getCurrentUser()
  if (!user) return { isConnected: false }

  const account = await prisma.account.findFirst({
    where: {
      userId: user.id,
      providerId: 'google',
    },
    select: { id: true, accessToken: true },
  })

  return {
    isConnected: Boolean(account?.accessToken),
    email: user.email,
  }
}

export async function syncGmailInboxAction(options?: {
  daysBack?: number
}): Promise<SyncInboxResponse> {
  const user = await requireUser()
  const { daysBack = 14 } = options || {}

  // 1. Fetch recent emails matching recruitment criteria
  const emailRes = await fetchRecentJobEmails(user.id, { daysBack, maxResults: 20 })

  if (!emailRes.success) {
    return {
      success: false,
      error: emailRes.error || 'Failed to access Gmail. Please ensure Google permissions are granted.',
      totalScanned: 0,
      jobRelatedCount: 0,
      updatedCount: 0,
      createdCount: 0,
      items: [],
    }
  }

  const rawEmails = emailRes.emails
  if (rawEmails.length === 0) {
    return {
      success: true,
      totalScanned: 0,
      jobRelatedCount: 0,
      updatedCount: 0,
      createdCount: 0,
      items: [],
    }
  }

  // 2. Parse emails with Gemini AI / Heuristic fallback in parallel
  const parsePromises = rawEmails.map((e) => parseJobEmailWithAI(e))
  const parsedResults = await Promise.all(parsePromises)

  const jobEmails = parsedResults.filter((p) => p.isJobRelated && p.companyName && p.companyName !== 'Company')

  const processedItems: SyncInboxResultItem[] = []
  let updatedCount = 0
  let createdCount = 0

  // 3. Process each job email against the database
  for (const item of jobEmails) {
    const cleanCompany = item.companyName.trim()
    if (!cleanCompany) continue

    // Search for existing application by company name
    const existing = await prisma.application.findFirst({
      where: {
        userId: user.id,
        OR: [
          { companyName: { equals: cleanCompany, mode: 'insensitive' as const } },
          { companyName: { contains: cleanCompany, mode: 'insensitive' as const } },
          ...(item.recruiterEmail ? [{ contactEmail: { equals: item.recruiterEmail, mode: 'insensitive' as const } }] : []),
        ],
      },
      select: {
        id: true,
        slug: true,
        companyName: true,
        roleTitle: true,
        status: true,
        contactName: true,
        contactEmail: true,
      },
    })

    let interviewScheduled = false

    if (existing) {
      const prevStatus = existing.status
      const targetStatus = item.detectedStatus || prevStatus
      const isStatusChanged = item.detectedStatus !== null && item.detectedStatus !== prevStatus

      // Schedule calendar event if interview detected
      let followUpDate: Date | undefined = undefined
      if (item.interviewDateTime) {
        followUpDate = new Date(item.interviewDateTime)
        interviewScheduled = true

        try {
          await createGoogleCalendarApiEvent(user.id, {
            title: `Interview: ${existing.roleTitle} @ ${existing.companyName}`,
            description: `${item.summary}\nRecruiter: ${item.recruiterName || ''} (${item.recruiterEmail || ''})`,
            startDate: followUpDate,
            durationMinutes: 45,
          })
        } catch {
          // Calendar event creation is best-effort
        }
      }

      await prisma.$transaction(async (tx) => {
        await tx.application.update({
          where: { id: existing.id },
          data: {
            status: targetStatus,
            ...(followUpDate ? { nextFollowUpDate: followUpDate } : {}),
            ...(item.recruiterName && !existing.contactName ? { contactName: item.recruiterName } : {}),
            ...(item.recruiterEmail && !existing.contactEmail ? { contactEmail: item.recruiterEmail } : {}),
          },
        })

        await tx.timelineEvent.create({
          data: {
            applicationId: existing.id,
            eventType: isStatusChanged ? 'STATUS_CHANGE' : 'CUSTOM',
            date: item.originalDate || new Date(),
            description: `${item.summary} · (Email: "${item.originalSubject}")`,
          },
        })
      })

      updatedCount++
      processedItems.push({
        id: existing.id,
        companyName: existing.companyName,
        roleTitle: existing.roleTitle,
        status: targetStatus,
        previousStatus: prevStatus,
        summary: item.summary,
        isNew: false,
        interviewScheduled,
        originalSubject: item.originalSubject,
        date: item.originalDate.toISOString(),
      })
    } else {
      // Create new application draft from email
      const baseSlug = `${cleanCompany.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${(item.roleTitle || 'role').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
      const existingCount = await prisma.application.count({
        where: { slug: { startsWith: baseSlug } },
      })
      const slug = existingCount > 0 ? `${baseSlug}-${existingCount + 1}-${Math.floor(Math.random() * 1000)}` : baseSlug
      const initialStatus = item.detectedStatus || ApplicationStatus.APPLIED

      let followUpDate: Date | null = null
      if (item.interviewDateTime) {
        followUpDate = new Date(item.interviewDateTime)
        interviewScheduled = true
      }

      const newApp = await prisma.application.create({
        data: {
          userId: user.id,
          slug,
          companyName: cleanCompany,
          roleTitle: item.roleTitle || 'Applicant / Role',
          status: initialStatus,
          dateApplied: item.originalDate,
          contactName: item.recruiterName || null,
          contactEmail: item.recruiterEmail || null,
          nextFollowUpDate: followUpDate,
          notes: `Auto-imported from email: "${item.originalSubject}"\nSummary: ${item.summary}`,
        },
      })

      await prisma.timelineEvent.create({
        data: {
          applicationId: newApp.id,
          eventType: 'STATUS_CHANGE',
          date: item.originalDate || new Date(),
          description: `Discovered from email: "${item.originalSubject}" · ${item.summary}`,
        },
      })

      createdCount++
      processedItems.push({
        id: newApp.id,
        companyName: cleanCompany,
        roleTitle: item.roleTitle || 'Applicant / Role',
        status: initialStatus,
        previousStatus: null,
        summary: item.summary,
        isNew: true,
        interviewScheduled,
        originalSubject: item.originalSubject,
        date: item.originalDate.toISOString(),
      })
    }
  }

  try {
    revalidatePath('/')
    revalidatePath('/applications')
    revalidatePath('/pipeline')
    revalidatePath('/triage')
    revalidatePath('/follow-ups')
    revalidatePath('/analytics')
  } catch {
    // Ignore outside Next request context
  }

  return {
    success: true,
    totalScanned: rawEmails.length,
    jobRelatedCount: jobEmails.length,
    updatedCount,
    createdCount,
    items: processedItems,
  }
}
