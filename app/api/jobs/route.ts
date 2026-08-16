import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const jobs = await prisma.job.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: {
        company: {
          select: {
            name: true,
            logoUrl: true,
            location: true,
          },
        },
      },
    })

    return NextResponse.json({ success: true, data: jobs })
  } catch (error: any) {
    console.error('Error fetching jobs from database:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch jobs',
        message:
          'Ensure your DATABASE_URL environment variable is configured and database is running.',
      },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { title, description, location, companyName, salaryMin, salaryMax, isRemote, type } = body

    if (!title || !description || !location || !companyName) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields (title, description, location, companyName)' },
        { status: 400 }
      )
    }

    // Find or create company
    let company = await prisma.company.findFirst({
      where: { name: companyName },
    })

    if (!company) {
      company = await prisma.company.create({
        data: {
          name: companyName,
          location: location,
        },
      })
    }

    const job = await prisma.job.create({
      data: {
        title,
        description,
        location,
        isRemote: Boolean(isRemote),
        salaryMin: salaryMin ? parseInt(salaryMin, 10) : null,
        salaryMax: salaryMax ? parseInt(salaryMax, 10) : null,
        type: type || 'FULL_TIME',
        companyId: company.id,
      },
      include: {
        company: true,
      },
    })

    return NextResponse.json({ success: true, data: job }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating job post:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create job' },
      { status: 500 }
    )
  }
}
