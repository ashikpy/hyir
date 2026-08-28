'use client'

import { useState } from 'react'
import { Edit2, Trash2 } from 'lucide-react'
import { Application } from '@prisma/client'
import { deleteApplication } from '@/app/actions'
import { EditApplicationModal } from './edit-app-modal'
import { useRouter } from 'next/navigation'

export function ApplicationActions({ application }: { application: Application }) {
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

  async function handleDelete() {
    if (confirm(`Are you sure you want to delete ${application.companyName}? This cannot be undone.`)) {
      setIsDeleting(true)
      try {
        await deleteApplication(application.id)
        router.push('/applications')
      } catch (e) {
        console.error(e)
        alert('Failed to delete application')
        setIsDeleting(false)
      }
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button 
        type="button"
        onClick={() => setIsEditOpen(true)}
        className="inline-flex items-center justify-center h-8 gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white px-3 rounded-xl text-xs font-medium transition-colors border border-zinc-800 cursor-pointer"
      >
        <Edit2 className="w-3.5 h-3.5" />
        <span>Edit</span>
      </button>

      <button 
        type="button"
        onClick={handleDelete}
        disabled={isDeleting}
        className="inline-flex items-center justify-center h-8 gap-1.5 bg-rose-950/30 hover:bg-rose-950/60 text-rose-400 hover:text-rose-300 px-3 rounded-xl text-xs font-medium transition-colors border border-rose-500/20 hover:border-rose-500/40 disabled:opacity-50 cursor-pointer"
        title="Delete application"
      >
        <Trash2 className="w-3.5 h-3.5" />
        <span>{isDeleting ? 'Deleting...' : 'Delete'}</span>
      </button>

      {isEditOpen && (
        <EditApplicationModal 
          application={application} 
          onClose={() => setIsEditOpen(false)} 
        />
      )}
    </div>
  )
}
