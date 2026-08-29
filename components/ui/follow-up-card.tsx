'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format, isPast, isToday } from 'date-fns'
import { Calendar, Plus, Check, Clock } from 'lucide-react'
import { scheduleCalendarFollowUp } from '@/app/actions'

interface FollowUpCardProps {
  applicationId: string
  nextFollowUpDate: Date | string | null
}

export function FollowUpCard({ applicationId, nextFollowUpDate }: FollowUpCardProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [customDate, setCustomDate] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const dateObj = nextFollowUpDate ? new Date(nextFollowUpDate) : null
  const isOverdue = dateObj && isPast(dateObj) && !isToday(dateObj)
  const isDueToday = dateObj && isToday(dateObj)

  async function handleSchedule(daysAhead: number | null, customVal?: string) {
    try {
      setIsLoading(true)
      setSuccessMsg(null)

      let dateStr = customVal
      if (daysAhead !== null) {
        const d = new Date()
        d.setDate(d.getDate() + daysAhead)
        dateStr = d.toISOString().split('T')[0]
      }

      if (!dateStr) return

      const res = await scheduleCalendarFollowUp(applicationId, dateStr)
      if (res.gcalWebUrl) {
        window.open(res.gcalWebUrl, '_blank')
      }
      setSuccessMsg('Scheduled on Google Calendar!')
      setIsOpen(false)
      router.refresh()
    } catch (err: any) {
      console.error('Failed to schedule follow up:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="p-5 rounded-2xl bg-zinc-950/60 border border-zinc-900 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-zinc-400" />
          Follow-up & Calendar
        </h3>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors cursor-pointer"
        >
          {isOpen ? 'Close' : dateObj ? 'Reschedule' : '+ Schedule'}
        </button>
      </div>

      {successMsg && (
        <div className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
          <Check className="w-3.5 h-3.5" /> {successMsg}
        </div>
      )}

      {dateObj ? (
        <div className="space-y-1">
          <span className="text-xs text-zinc-500 block">Next Scheduled For</span>
          <div className="flex items-center gap-2">
            <span
              className={`text-sm font-semibold ${
                isOverdue
                  ? 'text-red-400'
                  : isDueToday
                  ? 'text-amber-400'
                  : 'text-zinc-200'
              }`}
            >
              {format(dateObj, 'MMMM d, yyyy')}
            </span>
            {isOverdue && (
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-red-950/60 text-red-400 border border-red-900/50">
                Overdue
              </span>
            )}
            {isDueToday && (
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-amber-950/60 text-amber-400 border border-amber-900/50">
                Due Today
              </span>
            )}
          </div>
        </div>
      ) : (
        <p className="text-xs text-zinc-500">No follow-up scheduled.</p>
      )}

      {isOpen && (
        <div className="pt-3 border-t border-zinc-900 space-y-2.5 animate-in fade-in">
          <span className="text-[11px] text-zinc-400 block font-medium">Quick Presets (Google Calendar):</span>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { label: '+3 Days', days: 3 },
              { label: '+5 Days', days: 5 },
              { label: '+7 Days', days: 7 },
            ].map((p) => (
              <button
                key={p.days}
                type="button"
                disabled={isLoading}
                onClick={() => handleSchedule(p.days)}
                className="text-xs font-medium py-1.5 px-2 rounded-lg bg-zinc-900 hover:bg-blue-600 hover:text-white text-zinc-300 border border-zinc-800 hover:border-blue-500 transition-all cursor-pointer disabled:opacity-50 text-center"
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="bg-zinc-900/80 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500 flex-1"
            />
            <button
              type="button"
              disabled={!customDate || isLoading}
              onClick={() => handleSchedule(null, customDate)}
              className="px-3 py-1 bg-zinc-100 hover:bg-white text-black text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-40"
            >
              Set
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
