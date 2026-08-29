'use server'

import { prisma } from '@/lib/prisma'
import { ApplicationStatus, TimelineEventType, JobType, WorkplaceType } from '@prisma/client'
import { revalidatePath } from 'next/cache'

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

  // Get the first user since this is a personal tracker
  const user = await prisma.user.findFirst()
  if (!user) {
    throw new Error('No user found in database. Please seed the database first.')
  }

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
  const applications = await prisma.application.findMany({
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
  let user = await prisma.user.findFirst()
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: 'user@example.com',
        name: 'User'
      }
    })
  }

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
  const applications = await prisma.application.findMany({
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
  const apps = await prisma.application.findMany({
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
