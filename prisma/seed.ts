import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  const company = await prisma.company.create({
    data: {
      name: 'Acme Corp',
      description: 'Building the future of software engineering.',
      website: 'https://acme.example.com',
      location: 'San Francisco, CA',
    },
  })

  const job1 = await prisma.job.create({
    data: {
      title: 'Senior Full Stack Engineer',
      description: 'Looking for an experienced Next.js and Prisma developer to join our core product team.',
      location: 'Remote',
      isRemote: true,
      salaryMin: 140000,
      salaryMax: 180000,
      currency: 'USD',
      type: 'FULL_TIME',
      companyId: company.id,
    },
  })

  const job2 = await prisma.job.create({
    data: {
      title: 'Frontend Developer (React / TypeScript)',
      description: 'Help us craft stunning user interfaces with modern web standards.',
      location: 'New York, NY',
      isRemote: false,
      salaryMin: 110000,
      salaryMax: 150000,
      currency: 'USD',
      type: 'FULL_TIME',
      companyId: company.id,
    },
  })

  console.log('Database seeded successfully!')
  console.log({ company, jobs: [job1, job2] })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
