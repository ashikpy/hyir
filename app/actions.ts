'use server'

import { prisma } from '@/lib/prisma'
import { ApplicationStatus } from '@prisma/client'
import { revalidatePath } from 'next/cache'

export async function createApplication(formData: FormData) {
  const companyName = formData.get('companyName') as string
  const roleTitle = formData.get('roleTitle') as string
  const status = formData.get('status') as ApplicationStatus
  const dateApplied = formData.get('dateApplied') as string
  const applicationUrl = formData.get('applicationUrl') as string
  const salary = formData.get('salary') as string
  const location = formData.get('location') as string
  const contactName = formData.get('contactName') as string
  const contactEmail = formData.get('contactEmail') as string
  const contactRole = formData.get('contactRole') as string
  const contactUrl = formData.get('contactUrl') as string
  const notes = formData.get('notes') as string

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
      dateApplied: dateApplied ? new Date(dateApplied) : null,
      applicationUrl: applicationUrl || null,
      salary: salary || null,
      location: location || null,
      contactName: contactName || null,
      contactEmail: contactEmail || null,
      contactRole: contactRole || null,
      contactUrl: contactUrl || null,
      notes: notes || null,
    }
  })

  revalidatePath('/')
  revalidatePath('/applications')
  revalidatePath('/pipeline')
  return created.slug
}

export async function updateApplication(id: string, formData: FormData) {
  const companyName = formData.get('companyName') as string
  const roleTitle = formData.get('roleTitle') as string
  const status = formData.get('status') as ApplicationStatus
  const dateApplied = formData.get('dateApplied') as string
  const applicationUrl = formData.get('applicationUrl') as string
  const salary = formData.get('salary') as string
  const contactName = formData.get('contactName') as string
  const contactEmail = formData.get('contactEmail') as string
  const contactRole = formData.get('contactRole') as string
  const contactUrl = formData.get('contactUrl') as string
  const notes = formData.get('notes') as string

  if (!companyName || !roleTitle) {
    throw new Error('Company name and role title are required')
  }

  const baseSlug = `${companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${roleTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
  const existing = await prisma.application.findFirst({ where: { slug: { startsWith: baseSlug }, NOT: { id } } })
  const slug = existing ? `${baseSlug}-${Math.floor(Math.random() * 1000)}` : baseSlug

  const updated = await prisma.application.update({
    where: { id },
    data: {
      slug,
      companyName,
      roleTitle,
      status: status || 'SAVED',
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

  revalidatePath('/')
  revalidatePath('/applications')
  revalidatePath('/pipeline')
  revalidatePath(`/applications/${slug}`)
  
  return updated.slug
}

export async function deleteApplication(id: string) {
  await prisma.application.delete({
    where: { id }
  })
  
  revalidatePath('/')
  revalidatePath('/applications')
  revalidatePath('/pipeline')
}
