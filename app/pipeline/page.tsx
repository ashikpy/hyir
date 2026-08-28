import { prisma } from "@/lib/prisma"
import { KanbanBoard, KanbanApplication } from "@/components/ui/kanban-board"
import { AddApplicationButton } from "@/components/ui/add-app-button"
import { Plus } from "lucide-react"

export const dynamic = 'force-dynamic'

export default async function PipelinePage() {
  const applications = await prisma.application.findMany({
    select: {
      id: true,
      slug: true,
      companyName: true,
      roleTitle: true,
      status: true,
      location: true,
      workplaceType: true,
      salary: true,
      applicationUrl: true,
      updatedAt: true,
      nextFollowUpDate: true,
    },
    orderBy: { updatedAt: 'desc' }
  })

  return (
    <div className="flex flex-col h-full overflow-hidden pb-12 space-y-6">
      <header className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-4xl font-light tracking-tight mb-1 text-white">Pipeline Kanban</h1>
          <p className="text-zinc-400 text-sm">Drag and drop applications across stages to update their status.</p>
        </div>
        <AddApplicationButton className="flex items-center gap-2 bg-zinc-100 hover:bg-white text-black px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-sm cursor-pointer">
          <Plus className="w-4 h-4" /> Add Application
        </AddApplicationButton>
      </header>

      {/* Interactive Drag and Drop Kanban */}
      <KanbanBoard initialApplications={applications as KanbanApplication[]} />
    </div>
  )
}
