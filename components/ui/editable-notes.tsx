'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Pencil, Check, X, Loader2 } from 'lucide-react'
import { updateApplicationNotes } from '@/app/actions'

interface EditableNotesProps {
  applicationId: string
  initialNotes: string | null
  className?: string
}

export function EditableNotes({ applicationId, initialNotes, className = '' }: EditableNotesProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [notes, setNotes] = useState(initialNotes || '')
  const [savedNotes, setSavedNotes] = useState(initialNotes || '')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Keep local state in sync if initialNotes changes from server
  useEffect(() => {
    setNotes(initialNotes || '')
    setSavedNotes(initialNotes || '')
  }, [initialNotes])

  // Auto-resize textarea when entering edit mode or typing
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(
        Math.max(textareaRef.current.scrollHeight, 120),
        400
      )}px`
      textareaRef.current.focus()
      // Move cursor to end of text
      const len = textareaRef.current.value.length
      textareaRef.current.setSelectionRange(len, len)
    }
  }, [isEditing])

  const handleStartEdit = () => {
    setNotes(savedNotes)
    setIsEditing(true)
  }

  const handleCancel = () => {
    setNotes(savedNotes)
    setIsEditing(false)
  }

  const handleSave = () => {
    if (isPending) return
    const newNotes = notes.trim()
    
    // Optimistic UI update
    setSavedNotes(newNotes)
    setIsEditing(false)

    startTransition(async () => {
      try {
        await updateApplicationNotes(applicationId, newNotes)
        router.refresh()
      } catch (err) {
        console.error('Failed to save notes:', err)
        setSavedNotes(initialNotes || '')
        setNotes(initialNotes || '')
        alert('Failed to save notes. Please try again.')
      }
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleCancel()
    }
  }

  return (
    <section className={`p-6 rounded-2xl bg-zinc-950/60 border border-zinc-900 transition-all ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-900/80 pb-3">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-zinc-400" />
          <h3 className="text-xs font-semibold text-zinc-300">Notes & Strategy</h3>
        </div>

        {!isEditing ? (
          <button
            type="button"
            onClick={handleStartEdit}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-100 bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700 transition-all cursor-pointer group"
            title="Edit notes"
          >
            <Pencil className="w-3 h-3 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
            <span>Edit</span>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isPending}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-900 border border-zinc-800 transition-colors cursor-pointer disabled:opacity-50"
            >
              <X className="w-3 h-3" />
              <span>Cancel</span>
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold text-black bg-zinc-100 hover:bg-white transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Check className="w-3 h-3" />
              )}
              <span>{isPending ? 'Saving...' : 'Save'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Body Content */}
      <div className="pt-3">
        {isEditing ? (
          <div className="space-y-3 animate-in fade-in duration-150">
            <textarea
              ref={textareaRef}
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value)
                e.target.style.height = 'auto'
                e.target.style.height = `${Math.min(Math.max(e.target.scrollHeight, 120), 400)}px`
              }}
              onKeyDown={handleKeyDown}
              placeholder="Write down recruiter insights, talking points, portfolio links used, interview prep notes..."
              className="w-full min-h-[120px] bg-[#0c0c0e] border border-zinc-800 focus:border-zinc-600 rounded-xl p-3.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none transition-colors resize-none leading-relaxed"
            />
            <div className="flex items-center justify-between text-[11px] text-zinc-500">
              <span>
                Press <kbd className="px-1.5 py-0.5 rounded border border-zinc-800 bg-zinc-900 font-mono text-zinc-400">⌘ + ↵</kbd> to save · <kbd className="px-1.5 py-0.5 rounded border border-zinc-800 bg-zinc-900 font-mono text-zinc-400">Esc</kbd> to cancel
              </span>
            </div>
          </div>
        ) : savedNotes ? (
          <div 
            onClick={handleStartEdit}
            className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap font-normal cursor-pointer hover:text-zinc-100 transition-colors group/note rounded-lg -m-1.5 p-1.5 hover:bg-zinc-900/30"
            title="Click to edit notes"
          >
            {savedNotes}
          </div>
        ) : (
          <div
            onClick={handleStartEdit}
            className="border border-dashed border-zinc-900 hover:border-zinc-800 rounded-xl p-6 text-center cursor-pointer transition-colors group/empty"
          >
            <p className="text-sm text-zinc-600 group-hover/empty:text-zinc-400 transition-colors italic">
              No notes or strategy added for this application yet.
            </p>
            <span className="inline-flex items-center gap-1.5 mt-2 text-xs font-medium text-zinc-400 group-hover/empty:text-zinc-200 transition-colors">
              <Pencil className="w-3 h-3" />
              <span>Click to add notes</span>
            </span>
          </div>
        )}
      </div>
    </section>
  )
}
