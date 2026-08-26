'use client'

import { useState } from 'react'
import { X, FileText, Link as LinkIcon } from 'lucide-react'
import { updateDocuments } from '@/app/actions'

interface EditDocumentsModalProps {
  applicationId: string
  resumeVersion: string | null
  portfolioVersion: string | null
}

export function EditDocumentsModal({ applicationId, resumeVersion, portfolioVersion }: EditDocumentsModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, setIsPending] = useState(false)

  async function action(formData: FormData) {
    setIsPending(true)
    try {
      await updateDocuments(applicationId, formData)
      setIsOpen(false)
    } catch (e) {
      console.error(e)
      alert("Failed to update documents")
    } finally {
      setIsPending(false)
    }
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="text-xs font-medium text-zinc-500 hover:text-white transition-colors"
      >
        Edit documents
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-xs animate-fade-in"
            onClick={() => setIsOpen(false)}
          />
          <form 
            action={action}
            className="relative bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95"
          >
            <div className="flex items-center justify-between p-4 border-b border-zinc-900 bg-zinc-900/50">
              <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2"><FileText className="w-4 h-4"/> Document Links</h2>
              <button 
                type="button" 
                onClick={() => setIsOpen(false)}
                className="text-zinc-400 hover:text-zinc-100 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
                  <LinkIcon className="w-3.5 h-3.5" /> Resume Link (e.g. Google Drive / Notion)
                </label>
                <input 
                  name="resumeVersion" 
                  type="url"
                  defaultValue={resumeVersion || ''}
                  placeholder="https://..."
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg py-2 px-3 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
                  <LinkIcon className="w-3.5 h-3.5" /> Portfolio / Cover Letter Link
                </label>
                <input 
                  name="portfolioVersion"
                  type="url" 
                  defaultValue={portfolioVersion || ''}
                  placeholder="https://..."
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg py-2 px-3 text-sm text-zinc-300 focus:outline-none focus:border-zinc-500"
                />
              </div>
            </div>

            <div className="p-4 border-t border-zinc-900 bg-zinc-950 flex justify-end gap-3">
              <button 
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-xs font-medium text-zinc-400 hover:text-zinc-200 px-3 py-2"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={isPending}
                className="flex items-center gap-2 bg-white hover:bg-zinc-200 text-black px-4 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
              >
                {isPending ? 'Saving...' : 'Save Documents'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
