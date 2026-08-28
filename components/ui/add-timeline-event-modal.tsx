'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Plus, Calendar, Clock, FileText } from 'lucide-react'
import { addTimelineEvent } from '@/app/actions'
import { TimelineEventType } from '@prisma/client'

const EVENT_TYPES: { label: string; value: TimelineEventType }[] = [
  { label: 'Status Change', value: 'STATUS_CHANGE' },
  { label: 'Follow Up Sent', value: 'FOLLOW_UP' },
  { label: 'Note Added', value: 'NOTE_ADDED' },
  { label: 'Custom Event', value: 'CUSTOM' },
]

export function AddTimelineEventModal({ applicationId }: { applicationId: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  async function action(formData: FormData) {
    setIsPending(true)
    try {
      await addTimelineEvent(applicationId, formData)
      setIsOpen(false)
    } catch (e) {
      console.error(e)
      alert('Failed to add event')
    } finally {
      setIsPending(false)
    }
  }

  const modalContent = isOpen ? (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-md animate-fade-in transition-opacity"
        onClick={() => setIsOpen(false)}
      />

      {/* Modal Container */}
      <form 
        action={action}
        className="relative z-10 w-full max-w-md bg-[#0c0c0e] border border-zinc-800 rounded-2xl shadow-2xl shadow-black overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        style={{ backgroundColor: '#0c0c0e' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-[#0c0c0e]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">Add Timeline Event</h2>
              <p className="text-[11px] text-zinc-500">Record a milestone or activity</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={() => setIsOpen(false)}
            className="text-zinc-500 hover:text-zinc-300 p-1.5 rounded-lg hover:bg-zinc-900 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <div className="p-6 space-y-4 bg-[#0c0c0e]">
          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wider font-semibold text-zinc-400">Event Type</label>
            <select 
              name="eventType" 
              required
              className="w-full bg-[#141417] border border-zinc-800 rounded-xl py-2.5 px-3 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500 transition-colors cursor-pointer"
            >
              {EVENT_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wider font-semibold text-zinc-400">
              Date
            </label>
            <input 
              name="date"
              type="date" 
              defaultValue={new Date().toISOString().split('T')[0]}
              required
              className="w-full bg-[#141417] border border-zinc-800 rounded-xl py-2.5 px-3 text-sm text-zinc-200 focus:outline-none focus:border-zinc-500 transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wider font-semibold text-zinc-400">Description (Optional)</label>
            <textarea 
              name="description"
              rows={3}
              placeholder="e.g. Recruiter intro call held, discussed salary range..."
              className="w-full bg-[#141417] border border-zinc-800 rounded-xl py-2.5 px-3 text-sm text-zinc-200 focus:outline-none focus:border-zinc-500 transition-colors resize-none placeholder:text-zinc-600 leading-relaxed"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-zinc-800 bg-[#0c0c0e] flex justify-end gap-3">
          <button 
            type="button"
            onClick={() => setIsOpen(false)}
            className="text-xs font-medium text-zinc-400 hover:text-zinc-200 px-3 py-2 cursor-pointer transition-colors"
          >
            Cancel
          </button>
          <button 
            type="submit"
            disabled={isPending}
            className="flex items-center gap-2 bg-zinc-100 hover:bg-white text-black px-5 py-2 rounded-xl text-xs font-semibold transition-all disabled:opacity-50 shadow-md shadow-black/40 cursor-pointer"
          >
            {isPending ? 'Saving...' : 'Add Event'}
          </button>
        </div>
      </form>
    </div>
  ) : null

  return (
    <>
      <button 
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-100 transition-colors cursor-pointer bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-md"
      >
        <Plus className="w-3.5 h-3.5 text-zinc-400" />
        <span>Add event</span>
      </button>

      {mounted && modalContent && createPortal(modalContent, document.body)}
    </>
  )
}

