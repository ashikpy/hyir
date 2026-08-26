'use client'

import React, { useState, useEffect } from 'react'
import { Application, ApplicationStatus } from '@prisma/client'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { CompanyLogo } from '@/components/ui/avatars'
import { updateApplicationStatus } from '@/app/actions'

const PIPELINE_STAGES: { status: ApplicationStatus; label: string }[] = [
  { status: 'SAVED', label: 'Saved' },
  { status: 'APPLIED', label: 'Applied' },
  { status: 'CONTACTED', label: 'Contacted' },
  { status: 'SCREENING', label: 'Screening' },
  { status: 'INTERVIEW', label: 'Interview' },
  { status: 'ASSIGNMENT', label: 'Assignment' },
  { status: 'OFFER', label: 'Offer' },
]

interface KanbanBoardProps {
  initialApplications: Application[]
}

export function KanbanBoard({ initialApplications }: KanbanBoardProps) {
  const [isMounted, setIsMounted] = useState(false)
  const [columns, setColumns] = useState<Record<string, Application[]>>({})
  const router = useRouter()

  useEffect(() => {
    setIsMounted(true)
    const groupedApps: Record<string, Application[]> = {}
    PIPELINE_STAGES.forEach(stage => {
      groupedApps[stage.status] = initialApplications.filter(app => app.status === stage.status)
    })
    setColumns(groupedApps)
  }, [initialApplications])

  const onDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result

    // Dropped outside the list or no change
    if (!destination) return
    if (source.droppableId === destination.droppableId && source.index === destination.index) return

    const sourceStatus = source.droppableId as ApplicationStatus
    const destStatus = destination.droppableId as ApplicationStatus

    const sourceColumn = [...columns[sourceStatus]]
    const destColumn = sourceStatus === destStatus ? sourceColumn : [...columns[destStatus]]
    
    const [movedApp] = sourceColumn.splice(source.index, 1)

    if (sourceStatus === destStatus) {
      sourceColumn.splice(destination.index, 0, movedApp)
      setColumns({
        ...columns,
        [sourceStatus]: sourceColumn
      })
    } else {
      movedApp.status = destStatus
      destColumn.splice(destination.index, 0, movedApp)
      setColumns({
        ...columns,
        [sourceStatus]: sourceColumn,
        [destStatus]: destColumn
      })
      
      // Update in DB
      try {
        await updateApplicationStatus(draggableId, destStatus)
      } catch (e) {
        console.error("Failed to update status", e)
      }
    }
  }

  // Prevent SSR hydration mismatch for DnD
  if (!isMounted) {
    return <div className="flex flex-wrap gap-6 pb-8 flex-1 items-start">Loading board...</div>
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex flex-col gap-10 pb-8 flex-1 w-full">
        {PIPELINE_STAGES.map(stage => (
          <div key={stage.status} className="flex flex-col w-full">
            {/* Column Header */}
            <div className="flex items-center justify-between mb-4 px-1">
              <h3 className="text-xs uppercase tracking-widest font-semibold text-zinc-400">{stage.label}</h3>
              <span className="text-xs font-medium text-zinc-600 bg-zinc-900/50 px-2 py-0.5 rounded-full border border-zinc-800">
                {(columns[stage.status] || []).length}
              </span>
            </div>

            {/* Droppable Area */}
            <Droppable droppableId={stage.status} direction="horizontal">
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`flex flex-wrap gap-4 min-h-[100px] transition-colors rounded-lg ${
                    snapshot.isDraggingOver ? 'bg-zinc-900/30 ring-1 ring-zinc-800/50 p-2 -m-2' : ''
                  }`}
                >
                  {(columns[stage.status] || []).map((app, index) => (
                    <Draggable key={app.id} draggableId={app.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          onClick={() => {
                            if (!snapshot.isDragging) {
                              router.push(`/applications/${app.slug}`)
                            }
                          }}
                          className={`w-[280px] shrink-0 bg-zinc-950/80 border border-zinc-900 rounded-lg p-4 shadow-sm transition-all ${
                            snapshot.isDragging ? 'shadow-xl border-zinc-700 z-50 ring-1 ring-zinc-700/50 rotate-1 scale-[1.02] cursor-grabbing' : 'hover:border-zinc-700 cursor-grab'
                          }`}
                        >
                          <div className="block focus:outline-none">
                            <div className="flex items-center gap-3 mb-4">
                              <CompanyLogo name={app.companyName} url={app.applicationUrl} className="w-8 h-8 rounded-md" />
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-zinc-200 truncate">{app.companyName}</h4>
                                <p className="text-xs text-zinc-500 truncate">{app.roleTitle}</p>
                              </div>
                              <span className="text-xs text-zinc-600 self-start">{format(new Date(app.updatedAt), 'MMM d')}</span>
                            </div>
                            
                            <div className="flex items-center justify-between mt-auto">
                              {app.salary ? (
                                <span className="text-xs font-medium text-zinc-400">{app.salary}</span>
                              ) : (
                                <span className="text-xs text-zinc-700">—</span>
                              )}
                              
                              {app.nextFollowUpDate && (
                                <span className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-sm ${
                                  new Date(app.nextFollowUpDate) < new Date() 
                                    ? 'bg-red-400/10 text-red-400' 
                                    : 'bg-zinc-900 text-zinc-400'
                                }`}>
                                  FU: {format(new Date(app.nextFollowUpDate), 'MMM d')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                  
                  {(columns[stage.status] || []).length === 0 && !snapshot.isDraggingOver && (
                    <div className="border border-dashed border-zinc-900 rounded-lg p-4 text-center mx-2 mt-2">
                      <span className="text-xs text-zinc-600 font-medium italic">Drop here</span>
                    </div>
                  )}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </div>
    </DragDropContext>
  )
}
