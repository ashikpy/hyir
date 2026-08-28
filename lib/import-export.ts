import { ApplicationStatus, JobType, WorkplaceType, TimelineEventType } from '@prisma/client'

export interface ExportableApplication {
  id?: string
  companyName: string
  roleTitle: string
  status: ApplicationStatus
  dateApplied?: string | null
  jobType: JobType
  workplaceType: WorkplaceType
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
  createdAt?: string | null
  updatedAt?: string | null
  timelineEvents?: Array<{
    eventType: TimelineEventType
    date: string
    description?: string | null
  }>
}

export interface ParsedImportRecord {
  isValid: boolean
  error?: string
  companyName: string
  roleTitle: string
  status: ApplicationStatus
  dateApplied?: string | null
  jobType: JobType
  workplaceType: WorkplaceType
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

// ----------------------------------------------------------------------
// Status, JobType, and WorkplaceType Normalizers
// ----------------------------------------------------------------------

const STATUS_MAP: Record<string, ApplicationStatus> = {
  saved: 'SAVED',
  draft: 'SAVED',
  wishlist: 'SAVED',
  bookmark: 'SAVED',
  applied: 'APPLIED',
  submitted: 'APPLIED',
  contacted: 'CONTACTED',
  reached_out: 'CONTACTED',
  outreach: 'CONTACTED',
  screening: 'SCREENING',
  screen: 'SCREENING',
  recruiter_screen: 'SCREENING',
  phone_screen: 'SCREENING',
  hr_screen: 'SCREENING',
  interview: 'INTERVIEW',
  interviewing: 'INTERVIEW',
  tech_interview: 'INTERVIEW',
  onsite: 'INTERVIEW',
  assignment: 'ASSIGNMENT',
  take_home: 'ASSIGNMENT',
  assessment: 'ASSIGNMENT',
  challenge: 'ASSIGNMENT',
  offer: 'OFFER',
  offered: 'OFFER',
  accepted: 'ACCEPTED',
  hired: 'ACCEPTED',
  rejected: 'REJECTED',
  declined: 'REJECTED',
  ghosted: 'GHOSTED',
  no_response: 'GHOSTED',
  withdrawn: 'WITHDRAWN',
  cancelled: 'WITHDRAWN',
}

export function normalizeStatus(raw: string | undefined | null): ApplicationStatus {
  if (!raw) return 'SAVED'
  const key = raw.toLowerCase().trim().replace(/[\s-]+/g, '_')
  return STATUS_MAP[key] || 'APPLIED'
}

export function normalizeJobType(raw: string | undefined | null): JobType {
  if (!raw) return 'FULL_TIME'
  const clean = raw.toLowerCase().trim().replace(/[\s-]+/g, '_')
  if (clean.includes('part')) return 'PART_TIME'
  if (clean.includes('contract')) return 'CONTRACT'
  if (clean.includes('free')) return 'FREELANCE'
  if (clean.includes('intern')) return 'INTERNSHIP'
  return 'FULL_TIME'
}

export function normalizeWorkplaceType(raw: string | undefined | null): WorkplaceType {
  if (!raw) return 'REMOTE'
  const clean = raw.toLowerCase().trim()
  if (clean.includes('hybrid')) return 'HYBRID'
  if (clean.includes('onsite') || clean.includes('on-site') || clean.includes('in-office') || clean.includes('office')) return 'ONSITE'
  return 'REMOTE'
}

export function normalizeDate(raw: string | undefined | null): string | null {
  if (!raw) return null
  const parsed = new Date(raw.trim())
  if (isNaN(parsed.getTime())) return null
  return parsed.toISOString()
}

// ----------------------------------------------------------------------
// RFC 4180 Compliant CSV Parser & Serializer
// ----------------------------------------------------------------------

export function parseCSV(csvText: string): string[][] {
  const rows: string[][] = []
  let currentRow: string[] = []
  let currentCell = ''
  let insideQuote = false
  let i = 0
  const len = csvText.length

  while (i < len) {
    const char = csvText[i]
    const nextChar = i + 1 < len ? csvText[i + 1] : ''

    if (char === '"') {
      if (insideQuote && nextChar === '"') {
        // Escaped quote
        currentCell += '"'
        i += 2
        continue
      }
      insideQuote = !insideQuote
      i++
      continue
    }

    if (!insideQuote && char === ',') {
      currentRow.push(currentCell.trim())
      currentCell = ''
      i++
      continue
    }

    if (!insideQuote && (char === '\r' || char === '\n')) {
      if (char === '\r' && nextChar === '\n') {
        i++ // Skip \r in \r\n
      }
      currentRow.push(currentCell.trim())
      if (currentRow.some(c => c.length > 0)) {
        rows.push(currentRow)
      }
      currentRow = []
      currentCell = ''
      i++
      continue
    }

    currentCell += char
    i++
  }

  // Push remaining cell & row
  currentRow.push(currentCell.trim())
  if (currentRow.some(c => c.length > 0)) {
    rows.push(currentRow)
  }

  return rows
}

function escapeCSVCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function exportToCSV(applications: ExportableApplication[]): string {
  const headers = [
    'Company Name',
    'Role Title',
    'Status',
    'Job Type',
    'Workplace Type',
    'Location',
    'Salary',
    'Date Applied',
    'Application URL',
    'Job Description URL',
    'Contact Name',
    'Contact Role',
    'Contact Email',
    'Contact URL',
    'Next Follow-Up Date',
    'Resume Version',
    'Portfolio Version',
    'Notes',
    'Created At',
  ]

  const lines = [headers.join(',')]

  for (const app of applications) {
    const row = [
      escapeCSVCell(app.companyName),
      escapeCSVCell(app.roleTitle),
      escapeCSVCell(app.status),
      escapeCSVCell(app.jobType),
      escapeCSVCell(app.workplaceType),
      escapeCSVCell(app.location || ''),
      escapeCSVCell(app.salary || ''),
      escapeCSVCell(app.dateApplied ? new Date(app.dateApplied).toISOString().split('T')[0] : ''),
      escapeCSVCell(app.applicationUrl || ''),
      escapeCSVCell(app.jobDescriptionUrl || ''),
      escapeCSVCell(app.contactName || ''),
      escapeCSVCell(app.contactRole || ''),
      escapeCSVCell(app.contactEmail || ''),
      escapeCSVCell(app.contactUrl || ''),
      escapeCSVCell(app.nextFollowUpDate ? new Date(app.nextFollowUpDate).toISOString().split('T')[0] : ''),
      escapeCSVCell(app.resumeVersion || ''),
      escapeCSVCell(app.portfolioVersion || ''),
      escapeCSVCell(app.notes || ''),
      escapeCSVCell(app.createdAt ? new Date(app.createdAt).toISOString() : ''),
    ]
    lines.push(row.join(','))
  }

  return lines.join('\r\n')
}

export function exportToJSON(applications: ExportableApplication[]): string {
  return JSON.stringify(applications, null, 2)
}

// ----------------------------------------------------------------------
// Intelligent Column Header Mapping
// ----------------------------------------------------------------------

const COLUMN_ALIASES: Record<string, string[]> = {
  companyName: ['company', 'company name', 'company_name', 'employer', 'organization', 'org'],
  roleTitle: ['role', 'role title', 'role_title', 'title', 'job title', 'job_title', 'position'],
  status: ['status', 'stage', 'application status', 'state', 'current status'],
  dateApplied: ['date applied', 'date_applied', 'applied date', 'applied on', 'date', 'applied'],
  jobType: ['job type', 'job_type', 'type', 'employment type'],
  workplaceType: ['workplace', 'workplace type', 'workplace_type', 'work type', 'remote / onsite', 'setting'],
  location: ['location', 'city', 'geo', 'office location'],
  salary: ['salary', 'compensation', 'comp', 'pay', 'rate', 'target salary'],
  applicationUrl: ['application url', 'application_url', 'job url', 'job link', 'url', 'link', 'career link', 'posting url'],
  jobDescriptionUrl: ['job description url', 'job_description_url', 'jd url', 'description link', 'jd link'],
  contactName: ['contact', 'contact name', 'contact_name', 'recruiter', 'recruiter name', 'hiring manager'],
  contactRole: ['contact role', 'contact_role', 'recruiter title', 'contact title'],
  contactEmail: ['contact email', 'contact_email', 'recruiter email', 'email'],
  contactUrl: ['contact url', 'contact_url', 'contact profile', 'linkedin', 'contact linkedin'],
  nextFollowUpDate: ['next follow up', 'next_follow_up_date', 'follow up date', 'follow-up', 'next follow-up', 'follow up'],
  notes: ['notes', 'comments', 'strategy', 'description', 'details'],
  resumeVersion: ['resume', 'resume version', 'resume_version'],
  portfolioVersion: ['portfolio', 'portfolio version', 'portfolio_version'],
}

export function matchHeaderToField(headerName: string): string | null {
  const clean = headerName.toLowerCase().trim().replace(/[^a-z0-9]+/g, ' ')
  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    if (aliases.some(alias => clean === alias || clean.replace(/\s+/g, '') === alias.replace(/\s+/g, ''))) {
      return field
    }
  }
  return null
}

// ----------------------------------------------------------------------
// Parser from Raw CSV / JSON into Validated Records
// ----------------------------------------------------------------------

export function parseApplicationsFromCSV(csvContent: string): ParsedImportRecord[] {
  const rows = parseCSV(csvContent)
  if (rows.length < 2) return []

  const headerRow = rows[0]
  const fieldMapping: Record<number, string> = {}

  headerRow.forEach((colName, index) => {
    const matchedField = matchHeaderToField(colName)
    if (matchedField) {
      fieldMapping[index] = matchedField
    }
  })

  const results: ParsedImportRecord[] = []

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r]
    const recordMap: Record<string, string> = {}

    row.forEach((cellValue, idx) => {
      const field = fieldMapping[idx]
      if (field) {
        recordMap[field] = cellValue
      }
    })

    const companyName = (recordMap.companyName || '').trim()
    let roleTitle = (recordMap.roleTitle || '').trim()
    if (companyName && !roleTitle) {
      roleTitle = 'Product Designer'
    }

    if (!companyName && !roleTitle) {
      continue // Skip empty rows
    }

    const isValid = Boolean(companyName)
    const error = !companyName ? 'Missing Company Name' : undefined

    results.push({
      isValid,
      error,
      companyName: companyName || 'Unknown Company',
      roleTitle: roleTitle || 'Product Designer',
      status: normalizeStatus(recordMap.status),
      dateApplied: normalizeDate(recordMap.dateApplied),
      jobType: normalizeJobType(recordMap.jobType),
      workplaceType: normalizeWorkplaceType(recordMap.workplaceType),
      location: recordMap.location || null,
      salary: recordMap.salary || null,
      applicationUrl: recordMap.applicationUrl || null,
      jobDescriptionUrl: recordMap.jobDescriptionUrl || null,
      contactName: recordMap.contactName || null,
      contactRole: recordMap.contactRole || null,
      contactEmail: recordMap.contactEmail || null,
      contactUrl: recordMap.contactUrl || null,
      nextFollowUpDate: normalizeDate(recordMap.nextFollowUpDate),
      notes: recordMap.notes || null,
      resumeVersion: recordMap.resumeVersion || null,
      portfolioVersion: recordMap.portfolioVersion || null,
    })
  }

  return results
}

export function parseApplicationsFromJSON(jsonContent: string): ParsedImportRecord[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(jsonContent)
  } catch (e) {
    throw new Error('Invalid JSON format: ' + (e instanceof Error ? e.message : String(e)))
  }

  const items = Array.isArray(parsed) ? parsed : [parsed]
  const results: ParsedImportRecord[] = []

  for (const item of items) {
    if (!item || typeof item !== 'object') continue

    const obj = item as Record<string, unknown>
    const companyName = String(obj.companyName || obj.company || '').trim()
    const roleTitle = String(obj.roleTitle || obj.role || obj.title || '').trim()

    const isValid = Boolean(companyName && roleTitle)
    const error = !companyName
      ? 'Missing Company Name'
      : !roleTitle
      ? 'Missing Role Title'
      : undefined

    // Extract timeline events if present
    let timelineEvents: ParsedImportRecord['timelineEvents'] = undefined
    if (Array.isArray(obj.timelineEvents)) {
      timelineEvents = obj.timelineEvents.map((evt: Record<string, unknown>) => ({
        eventType: (evt.eventType as TimelineEventType) || 'STATUS_CHANGE',
        date: normalizeDate(String(evt.date)) || new Date().toISOString(),
        description: evt.description ? String(evt.description) : null,
      }))
    }

    results.push({
      isValid,
      error,
      companyName: companyName || 'Unknown Company',
      roleTitle: roleTitle || 'Untitled Role',
      status: normalizeStatus(String(obj.status || '')),
      dateApplied: normalizeDate(obj.dateApplied ? String(obj.dateApplied) : null),
      jobType: normalizeJobType(obj.jobType ? String(obj.jobType) : null),
      workplaceType: normalizeWorkplaceType(obj.workplaceType ? String(obj.workplaceType) : null),
      location: obj.location ? String(obj.location) : null,
      salary: obj.salary ? String(obj.salary) : null,
      applicationUrl: obj.applicationUrl ? String(obj.applicationUrl) : null,
      jobDescriptionUrl: obj.jobDescriptionUrl ? String(obj.jobDescriptionUrl) : null,
      contactName: obj.contactName ? String(obj.contactName) : null,
      contactRole: obj.contactRole ? String(obj.contactRole) : null,
      contactEmail: obj.contactEmail ? String(obj.contactEmail) : null,
      contactUrl: obj.contactUrl ? String(obj.contactUrl) : null,
      nextFollowUpDate: normalizeDate(obj.nextFollowUpDate ? String(obj.nextFollowUpDate) : null),
      notes: obj.notes ? String(obj.notes) : null,
      resumeVersion: obj.resumeVersion ? String(obj.resumeVersion) : null,
      portfolioVersion: obj.portfolioVersion ? String(obj.portfolioVersion) : null,
      timelineEvents,
    })
  }

  return results
}

// ----------------------------------------------------------------------
// Sample Template Generator
// ----------------------------------------------------------------------

export function getSampleCSVTemplate(): string {
  const sampleApps: ExportableApplication[] = [
    {
      companyName: 'Linear',
      roleTitle: 'Product Designer',
      status: 'APPLIED',
      jobType: 'FULL_TIME',
      workplaceType: 'REMOTE',
      location: 'Remote (US)',
      salary: '$150k - $180k',
      dateApplied: new Date().toISOString().split('T')[0],
      applicationUrl: 'https://linear.app/careers',
      contactName: 'Karri Saarinen',
      contactEmail: 'karri@linear.app',
      contactUrl: 'https://linkedin.com/in/ksaarinen',
      nextFollowUpDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      notes: 'Customized portfolio with Linear case study.',
    },
    {
      companyName: 'Figma',
      roleTitle: 'Senior UI Engineer',
      status: 'INTERVIEW',
      jobType: 'FULL_TIME',
      workplaceType: 'HYBRID',
      location: 'San Francisco, CA',
      salary: '$180k - $220k',
      dateApplied: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      applicationUrl: 'https://figma.com/careers',
      contactName: 'Sarah Recruiter',
      contactEmail: 'recruiting@figma.com',
      nextFollowUpDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      notes: 'Completed technical loop; waiting on offer discussion.',
    },
  ]

  return exportToCSV(sampleApps)
}
