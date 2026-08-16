'use client'

import { useState } from 'react'
import { Edit2, Trash2, MoreHorizontal } from 'lucide-react'
import { Application } from '@prisma/client'
import { deleteApplication } from '@/app/actions'
import { EditApplicationModal } from './edit-app-modal'
import { useRouter } from 'next/navigation'

export function ApplicationActions({ application }: { application: Application }) {
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

  async function handleDelete() {
    if (confirm('Are you sure you want to delete this application? This cannot be undone.')) {
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
    <div className="relative">
      <div className="flex items-center gap-2">
        <button 
          onClick={() => setIsEditOpen(true)}
          className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-colors border border-zinc-800"
        >
          <Edit2 className="w-3 h-3" /> Edit
        </button>
        
        <div className="relative">
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-zinc-900 transition-colors text-zinc-400 hover:text-white"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
          
          {isMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)} />
              <div className="absolute right-0 mt-2 w-48 bg-zinc-950 border border-zinc-800 rounded-md shadow-xl z-50 overflow-hidden">
                <button 
                  onClick={() => {
                    setIsMenuOpen(false)
                    handleDelete()
                  }}
                  disabled={isDeleting}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50 text-left"
                >
                  <Trash2 className="w-4 h-4" /> {isDeleting ? 'Deleting...' : 'Delete Application'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {isEditOpen && (
        <EditApplicationModal 
          application={application} 
          onClose={() => setIsEditOpen(false)} 
        />
      )}
    </div>
  )
}
