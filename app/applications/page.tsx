import { prisma } from "@/lib/prisma"
import { Plus } from "lucide-react"
import { AddApplicationButton } from "@/components/ui/add-app-button"
import { ImportExportButtons } from "@/components/ui/import-export-button"
import { ApplicationsTable } from "@/components/ui/applications-table"

export const dynamic = 'force-dynamic'

export default async function ApplicationsPage() {
  const applications = await prisma.application.findMany({
    orderBy: { updatedAt: 'desc' }
  })

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-light tracking-tight mb-1 text-white">Job Applications</h1>
          <p className="text-zinc-400 text-sm">{applications.length} total applications</p>
        </div>
        <div className="flex items-center gap-3">
          <ImportExportButtons />
          <AddApplicationButton className="flex items-center gap-2 bg-zinc-100 hover:bg-white text-black px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-sm cursor-pointer">
            <Plus className="w-4 h-4" /> Add Application
          </AddApplicationButton>
        </div>
      </header>

      {/* Interactive Table with Company, Status, Type, Location, Contact, Applied, Follow-up */}
      <ApplicationsTable applications={applications} />
    </div>
  )
}
