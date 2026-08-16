import { PrismaClient, ApplicationStatus, JobType, WorkplaceType, TimelineEventType } from '@prisma/client'
import { subDays, addDays } from 'date-fns'

const prisma = new PrismaClient()

function generateSlug(company: string, role: string) {
  return `${company.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${role.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
}

async function main() {
  console.log('Clearing existing data...')
  await prisma.timelineEvent.deleteMany()
  await prisma.application.deleteMany()
  await prisma.user.deleteMany()

  console.log('Seeding database for Personal Job Tracker...')

  // Create personal user
  const user = await prisma.user.create({
    data: {
      email: 'hello@example.com',
      name: 'Jane Designer',
      avatarUrl: 'https://api.dicebear.com/7.x/notionists/svg?seed=Jane',
    },
  })

  const now = new Date()

  // Helper to create applications with events
  const createSelectedApps = async () => {
    // 1. Saved (Draft)
    const app1 = await prisma.application.create({
      data: {
        userId: user.id,
        slug: generateSlug("Notion", "Senior Product Designer"),
        companyName: "Notion",
        roleTitle: "Senior Product Designer",
        status: ApplicationStatus.SAVED,
        dateApplied: null,
        jobType: JobType.FULL_TIME,
        workplaceType: WorkplaceType.HYBRID,
        location: 'San Francisco, CA',
        salary: '$160k - $210k',
        applicationUrl: 'https://notion.so/careers',
        notes: 'Need to update portfolio with the latest B2B SaaS case study before applying.',
      }
    })

    // 2. Applied (Recent)
    await prisma.application.create({
      data: {
        userId: user.id,
        slug: generateSlug("Linear", "Product Designer"),
        companyName: 'Linear',
        roleTitle: 'Product Designer',
        status: ApplicationStatus.APPLIED,
        dateApplied: subDays(now, 2),
        jobType: JobType.FULL_TIME,
        workplaceType: WorkplaceType.REMOTE,
        location: 'Remote (US)',
        salary: '$150k+',
        applicationUrl: 'https://linear.app/careers',
        nextFollowUpDate: addDays(now, 5),
        timelineEvents: {
          create: [
            { eventType: TimelineEventType.STATUS_CHANGE, date: subDays(now, 2), description: 'Submitted application via website.' }
          ]
        }
      }
    })

    // 3. Contacted (Followed up)
    await prisma.application.create({
      data: {
        userId: user.id,
        slug: generateSlug("Vercel", "Design Engineer"),
        companyName: 'Vercel',
        roleTitle: 'Design Engineer',
        status: ApplicationStatus.CONTACTED,
        dateApplied: subDays(now, 10),
        jobType: JobType.FULL_TIME,
        workplaceType: WorkplaceType.REMOTE,
        location: 'Remote',
        contactName: 'Guillermo Rauch',
        contactUrl: 'https://linkedin.com/in/rauchg',
        nextFollowUpDate: subDays(now, 1), // Overdue
        notes: 'Cold emailed Guillermo directly.',
        timelineEvents: {
          create: [
            { eventType: TimelineEventType.STATUS_CHANGE, date: subDays(now, 10), description: 'Applied online.' },
            { eventType: TimelineEventType.FOLLOW_UP, date: subDays(now, 8), description: 'Sent cold email with portfolio.' }
          ]
        }
      }
    })

    // 4. Screening (Active)
    await prisma.application.create({
      data: {
        userId: user.id,
        slug: generateSlug("Stripe", "UX Researcher"),
        companyName: 'Stripe',
        roleTitle: 'UX Researcher',
        status: ApplicationStatus.SCREENING,
        dateApplied: subDays(now, 15),
        jobType: JobType.FULL_TIME,
        workplaceType: WorkplaceType.HYBRID,
        location: 'Seattle, WA',
        contactName: 'Sarah Smith',
        contactRole: 'Technical Recruiter',
        nextFollowUpDate: now, // Today
        timelineEvents: {
          create: [
            { eventType: TimelineEventType.STATUS_CHANGE, date: subDays(now, 15), description: 'Applied via referral.' },
            { eventType: TimelineEventType.STATUS_CHANGE, date: subDays(now, 5), description: 'Recruiter reached out for a screening call.' },
            { eventType: TimelineEventType.NOTE_ADDED, date: subDays(now, 2), description: 'Screening call scheduled for tomorrow.' }
          ]
        }
      }
    })

    // 5. Interview
    await prisma.application.create({
      data: {
        userId: user.id,
        slug: generateSlug("Figma", "Product Designer, Collaboration"),
        companyName: 'Figma',
        roleTitle: 'Product Designer, Collaboration',
        status: ApplicationStatus.INTERVIEW,
        dateApplied: subDays(now, 20),
        jobType: JobType.FULL_TIME,
        workplaceType: WorkplaceType.ONSITE,
        location: 'San Francisco, CA',
        contactName: 'Alex Johnson',
        contactRole: 'Design Manager',
        nextFollowUpDate: addDays(now, 2),
        timelineEvents: {
          create: [
            { eventType: TimelineEventType.STATUS_CHANGE, date: subDays(now, 20), description: 'Applied.' },
            { eventType: TimelineEventType.STATUS_CHANGE, date: subDays(now, 14), description: 'Passed screening.' },
            { eventType: TimelineEventType.STATUS_CHANGE, date: subDays(now, 7), description: 'Completed first round interview.' },
            { eventType: TimelineEventType.STATUS_CHANGE, date: subDays(now, 1), description: 'Invited to final onsite loop.' }
          ]
        }
      }
    })

    // 6. Assignment
    await prisma.application.create({
      data: {
        userId: user.id,
        slug: generateSlug("Raycast", "UI Designer"),
        companyName: 'Raycast',
        roleTitle: 'UI Designer',
        status: ApplicationStatus.ASSIGNMENT,
        dateApplied: subDays(now, 25),
        jobType: JobType.FULL_TIME,
        workplaceType: WorkplaceType.REMOTE,
        location: 'Remote (EMEA)',
        salary: '£80k - £100k',
        nextFollowUpDate: addDays(now, 3),
        notes: 'Take-home assignment due this Friday. Redesign the extension store.',
        timelineEvents: {
          create: [
            { eventType: TimelineEventType.STATUS_CHANGE, date: subDays(now, 25), description: 'Applied.' },
            { eventType: TimelineEventType.STATUS_CHANGE, date: subDays(now, 20), description: 'Screening call.' },
            { eventType: TimelineEventType.STATUS_CHANGE, date: subDays(now, 4), description: 'Received take-home assignment.' }
          ]
        }
      }
    })

    // 7. Offer
    await prisma.application.create({
      data: {
        userId: user.id,
        slug: generateSlug("Arc", "Senior Browser Designer"),
        companyName: 'Arc',
        roleTitle: 'Senior Browser Designer',
        status: ApplicationStatus.OFFER,
        dateApplied: subDays(now, 35),
        jobType: JobType.FULL_TIME,
        workplaceType: WorkplaceType.ONSITE,
        location: 'New York, NY',
        salary: '$180k + Equity',
        nextFollowUpDate: addDays(now, 1),
        notes: 'Negotiating base salary.',
        timelineEvents: {
          create: [
            { eventType: TimelineEventType.STATUS_CHANGE, date: subDays(now, 35), description: 'Applied.' },
            { eventType: TimelineEventType.STATUS_CHANGE, date: subDays(now, 30), description: 'First interview.' },
            { eventType: TimelineEventType.STATUS_CHANGE, date: subDays(now, 15), description: 'Final loop.' },
            { eventType: TimelineEventType.STATUS_CHANGE, date: subDays(now, 2), description: 'Verbal offer received!' }
          ]
        }
      }
    })

    // 8. Rejected
    await prisma.application.create({
      data: {
        userId: user.id,
        slug: generateSlug("Apple", "Human Interface Designer"),
        companyName: 'Apple',
        roleTitle: 'Human Interface Designer',
        status: ApplicationStatus.REJECTED,
        dateApplied: subDays(now, 40),
        jobType: JobType.FULL_TIME,
        workplaceType: WorkplaceType.ONSITE,
        location: 'Cupertino, CA',
        timelineEvents: {
          create: [
            { eventType: TimelineEventType.STATUS_CHANGE, date: subDays(now, 40), description: 'Applied.' },
            { eventType: TimelineEventType.STATUS_CHANGE, date: subDays(now, 35), description: 'Screening call.' },
            { eventType: TimelineEventType.STATUS_CHANGE, date: subDays(now, 10), description: 'Received generic rejection email.' }
          ]
        }
      }
    })

    // 9. Ghosted
    await prisma.application.create({
      data: {
        userId: user.id,
        slug: generateSlug("Acme Corp", "Web Designer"),
        companyName: 'Acme Corp',
        roleTitle: 'Web Designer',
        status: ApplicationStatus.GHOSTED,
        dateApplied: subDays(now, 60),
        jobType: JobType.FULL_TIME,
        workplaceType: WorkplaceType.REMOTE,
        location: 'Remote',
        timelineEvents: {
          create: [
            { eventType: TimelineEventType.STATUS_CHANGE, date: subDays(now, 60), description: 'Applied.' },
            { eventType: TimelineEventType.FOLLOW_UP, date: subDays(now, 45), description: 'Sent follow up email. No response.' },
            { eventType: TimelineEventType.FOLLOW_UP, date: subDays(now, 30), description: 'Sent second follow up email. No response. Moving on.' }
          ]
        }
      }
    })
    
    // 10. More generic applications for list padding
    const companies = ['Spotify', 'Netflix', 'Airbnb', 'DoorDash', 'Rippling', 'Brex']
    for (let i = 0; i < companies.length; i++) {
      await prisma.application.create({
        data: {
          userId: user.id,
          slug: generateSlug(companies[i], 'Product Designer'),
          companyName: companies[i],
          roleTitle: 'Product Designer',
          status: ApplicationStatus.APPLIED,
          dateApplied: subDays(now, 3 + i),
          jobType: JobType.FULL_TIME,
          workplaceType: WorkplaceType.HYBRID,
          location: 'Various',
        }
      })
    }
  }

  await createSelectedApps()

  console.log('Database seeded successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
