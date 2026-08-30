'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, Sparkles, Loader2, CheckCircle2, AlertCircle, Calendar, ArrowRight, X, Inbox } from 'lucide-react'
import { syncGmailInboxAction, SyncInboxResponse, SyncInboxResultItem } from '@/app/actions'
import { ApplicationStatus } from '@prisma/client'
import Link from 'next/link'

interface InboxSyncModalProps {
  isOpen: boolean
  onClose: () => void
  initialResult?: SyncInboxResponse | null
}

const statusColors: Record<ApplicationStatus, { bg: string; text: string; border: string }> = {
  SAVED: { bg: 'bg-zinc-800/60', text: 'text-zinc-300', border: 'border-zinc-700' },
  APPLIED: { bg: 'bg-blue-950/60', text: 'text-blue-300', border: 'border-blue-800/60' },
  CONTACTED: { bg: 'bg-indigo-950/60', text: 'text-indigo-300', border: 'border-indigo-800/60' },
  SCREENING: { bg: 'bg-cyan-950/60', text: 'text-cyan-300', border: 'border-cyan-800/60' },
  INTERVIEW: { bg: 'bg-amber-950/60', text: 'text-amber-300', border: 'border-amber-700/60' },
  ASSIGNMENT: { bg: 'bg-purple-950/60', text: 'text-purple-300', border: 'border-purple-800/60' },
  OFFER: { bg: 'bg-emerald-950/60', text: 'text-emerald-300', border: 'border-emerald-700/60' },
  ACCEPTED: { bg: 'bg-emerald-900/80', text: 'text-emerald-200', border: 'border-emerald-500' },
  REJECTED: { bg: 'bg-red-950/60', text: 'text-red-300', border: 'border-red-800/60' },
  GHOSTED: { bg: 'bg-zinc-900/60', text: 'text-zinc-400', border: 'border-zinc-800' },
  WITHDRAWN: { bg: 'bg-zinc-900/60', text: 'text-zinc-400', border: 'border-zinc-800' },
}

export function InboxSyncModal({ isOpen, onClose }: InboxSyncModalProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<SyncInboxResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [hasStarted, setHasStarted] = useState(false)

  if (!isOpen) return null

  function handleRunSync() {
    setError(null)
    setHasStarted(true)
    startTransition(async () => {
      try {
        const res = await syncGmailInboxAction({ daysBack: 14 })
        if (!res.success) {
          setError(res.error || 'Failed to scan inbox.')
        } else {
          setResult(res)
          router.refresh()
        }
      } catch (err: any) {
        setError(err?.message || 'Something went wrong during inbox sync.')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-850">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-1.5">
                <span>AI Inbox Sync</span>
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              </h3>
              <p className="text-xs text-zinc-400">
                Scan Gmail for recruiter updates, interview invites, and application status
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {!hasStarted && !result && !error && (
            <div className="text-center py-8 space-y-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-zinc-900/90 border border-zinc-800 flex items-center justify-center text-zinc-300 shadow-inner">
                <Inbox className="w-7 h-7 text-zinc-400" />
              </div>
              <div className="max-w-sm mx-auto space-y-1.5">
                <h4 className="text-sm font-medium text-zinc-200">
                  Ready to scan your recent job emails
                </h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Hyir will inspect emails from the last 14 days for interview invitations, stage updates, and recruiter replies.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleRunSync}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-semibold shadow-md transition-all cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Start Inbox Scan</span>
                </button>
              </div>
            </div>
          )}

          {isPending && (
            <div className="py-12 text-center space-y-3">
              <Loader2 className="w-8 h-8 mx-auto text-amber-400 animate-spin" />
              <p className="text-xs font-medium text-zinc-200">
                Scanning recent emails & running AI classification...
              </p>
              <p className="text-[11px] text-zinc-500">
                Matching companies and updating your pipeline
              </p>
            </div>
          )}

          {error && !isPending && (
            <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/50 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-red-300">
                <AlertCircle className="w-4 h-4" />
                <span>Inbox Sync Notice</span>
              </div>
              <p className="text-xs text-red-200/90 leading-relaxed">{error}</p>
              {error.includes('permission') && (
                <p className="text-[11px] text-zinc-400 pt-1">
                  Tip: Log out and sign in again with Google to grant Gmail read permissions.
                </p>
              )}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleRunSync}
                  className="text-xs px-3 py-1.5 rounded-lg bg-zinc-900 text-zinc-200 hover:bg-zinc-800 border border-zinc-700 transition-colors cursor-pointer"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}

          {result && !isPending && (
            <div className="space-y-4">
              {/* Summary stat cards */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 text-center">
                  <span className="block text-lg font-semibold text-zinc-100 font-mono">
                    {result.totalScanned}
                  </span>
                  <span className="text-[11px] text-zinc-400 font-medium">Emails Scanned</span>
                </div>
                <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 text-center">
                  <span className="block text-lg font-semibold text-emerald-400 font-mono">
                    {result.updatedCount}
                  </span>
                  <span className="text-[11px] text-zinc-400 font-medium">Stage Updates</span>
                </div>
                <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 text-center">
                  <span className="block text-lg font-semibold text-cyan-400 font-mono">
                    {result.createdCount}
                  </span>
                  <span className="text-[11px] text-zinc-400 font-medium">New Discovered</span>
                </div>
              </div>

              {/* Items List */}
              {result.items.length === 0 ? (
                <div className="py-8 text-center space-y-2 rounded-xl bg-zinc-900/20 border border-dashed border-zinc-800">
                  <CheckCircle2 className="w-6 h-6 mx-auto text-zinc-500" />
                  <p className="text-xs text-zinc-400 font-medium">
                    No new job updates found in recent emails.
                  </p>
                  <p className="text-[11px] text-zinc-500">Your job pipeline is up to date!</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                    Discovered Updates ({result.items.length})
                  </h4>

                  <div className="space-y-2">
                    {result.items.map((item) => (
                      <div
                        key={item.id}
                        className="p-3.5 rounded-xl bg-zinc-900/70 border border-zinc-800/80 hover:border-zinc-700 transition-colors space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-semibold text-xs text-zinc-100 truncate">
                              {item.companyName}
                            </span>
                            {item.roleTitle && (
                              <span className="text-[11px] text-zinc-400 truncate">
                                · {item.roleTitle}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {item.isNew && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-cyan-950 text-cyan-300 border border-cyan-800/50">
                                New App
                              </span>
                            )}

                            {item.status && (
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-medium border ${
                                  statusColors[item.status]?.bg || 'bg-zinc-800'
                                } ${statusColors[item.status]?.text || 'text-zinc-300'} ${
                                  statusColors[item.status]?.border || 'border-zinc-700'
                                }`}
                              >
                                {item.status.replace('_', ' ')}
                              </span>
                            )}
                          </div>
                        </div>

                        <p className="text-xs text-zinc-300 leading-relaxed font-normal">
                          {item.summary}
                        </p>

                        <div className="flex items-center justify-between pt-1 text-[11px] text-zinc-500 border-t border-zinc-900">
                          <span className="truncate max-w-[280px]">
                            Email: &quot;{item.originalSubject}&quot;
                          </span>

                          {item.interviewScheduled && (
                            <span className="inline-flex items-center gap-1 text-amber-400 font-medium text-[10px]">
                              <Calendar className="w-3 h-3" />
                              Calendar Synced
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-zinc-900/40 border-t border-zinc-850">
          <div className="text-[11px] text-zinc-500">
            Powered by Gemini AI & Gmail Read-Only Sync
          </div>
          <div className="flex items-center gap-2">
            {result && !isPending && (
              <button
                type="button"
                onClick={handleRunSync}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Scan Again
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-200 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
