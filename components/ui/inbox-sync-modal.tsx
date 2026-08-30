'use client'

import { useState, useEffect, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { Mail, Sparkles, Loader2, CheckCircle2, AlertCircle, Calendar, X, Inbox } from 'lucide-react'
import { syncGmailInboxAction, checkGmailConnectionStatus, SyncInboxResponse } from '@/app/actions'
import { linkSocial, signIn } from '@/lib/auth-client'
import { ApplicationStatus } from '@prisma/client'

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
  const [mounted, setMounted] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false)
  const [isGoogleConnected, setIsGoogleConnected] = useState<boolean | null>(null)
  const [result, setResult] = useState<SyncInboxResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [hasStarted, setHasStarted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (isOpen) {
      checkGmailConnectionStatus()
        .then((status) => {
          setIsGoogleConnected(status.isConnected)
        })
        .catch(() => {
          setIsGoogleConnected(false)
        })
    }
  }, [isOpen])

  if (!isOpen || !mounted) return null

  async function handleConnectGoogle() {
    try {
      setIsConnectingGoogle(true)
      setError(null)
      if (typeof linkSocial === 'function') {
        await linkSocial({
          provider: 'google',
          callbackURL: window.location.href,
        })
      } else {
        await signIn.social({
          provider: 'google',
          callbackURL: window.location.href,
        })
      }
    } catch (err: any) {
      // Fallback
      await signIn.social({
        provider: 'google',
        callbackURL: window.location.href,
      })
    } finally {
      setIsConnectingGoogle(false)
    }
  }

  function handleRunSync() {
    setError(null)
    setHasStarted(true)
    startTransition(async () => {
      try {
        const res = await syncGmailInboxAction({ daysBack: 14 })
        if (!res.success) {
          setError(res.error || 'Failed to scan inbox.')
          if (res.error?.includes('No Google account connected') || res.error?.includes('permission')) {
            setIsGoogleConnected(false)
          }
        } else {
          setResult(res)
          setIsGoogleConnected(true)
          router.refresh()
        }
      } catch (err: any) {
        setError(err?.message || 'Something went wrong during inbox sync.')
      }
    })
  }

  const isNotConnected = isGoogleConnected === false || (error && error.includes('Google account'))

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Opaque backdrop */}
      <div
        className="fixed inset-0 bg-black/85 backdrop-blur-md animate-in fade-in duration-150"
        onClick={onClose}
      />

      {/* Solid Modal Container */}
      <div
        className="relative z-10 w-full max-w-xl bg-[#09090b] border border-zinc-800 rounded-2xl shadow-2xl shadow-black overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150"
        style={{ backgroundColor: '#09090b' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-850 bg-[#0c0c0e]">
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
        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-[#09090b]">
          {/* Not Connected State -> 1-Click Connect Google Button */}
          {isNotConnected && !isPending && (
            <div className="text-center py-6 space-y-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300 shadow-inner">
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15.1c0 2.8.7 5.4 1.9 7.8l3.7-2.9z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2-6.4-4.8L1.9 17c1.8 3.7 5.6 6.5 10.1 6.5z"
                  />
                </svg>
              </div>

              <div className="max-w-sm mx-auto space-y-1.5">
                <h4 className="text-sm font-medium text-zinc-100">
                  Connect your Google Account
                </h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Link your Gmail account to enable automatic inbox scanning for interview invites and stage updates.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  disabled={isConnectingGoogle}
                  onClick={handleConnectGoogle}
                  className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-semibold shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {isConnectingGoogle ? (
                    <Loader2 className="w-4 h-4 animate-spin text-zinc-600" />
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#EA4335"
                        d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
                      />
                      <path
                        fill="#4285F4"
                        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15.1c0 2.8.7 5.4 1.9 7.8l3.7-2.9z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2-6.4-4.8L1.9 17c1.8 3.7 5.6 6.5 10.1 6.5z"
                      />
                    </svg>
                  )}
                  <span>Connect Google & Gmail</span>
                </button>
              </div>
            </div>
          )}

          {/* Ready State */}
          {!isNotConnected && !hasStarted && !result && !error && (
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

          {/* Pending Progress */}
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

          {/* Error State */}
          {error && !isPending && !isNotConnected && (
            <div className="p-4 rounded-xl bg-red-950/60 border border-red-800/60 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-red-300">
                <AlertCircle className="w-4 h-4" />
                <span>Inbox Sync Notice</span>
              </div>
              <p className="text-xs text-red-200/90 leading-relaxed">{error}</p>
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRunSync}
                  className="text-xs px-3 py-1.5 rounded-lg bg-zinc-900 text-zinc-200 hover:bg-zinc-800 border border-zinc-700 transition-colors cursor-pointer"
                >
                  Try Again
                </button>
                <button
                  type="button"
                  onClick={handleConnectGoogle}
                  className="text-xs px-3 py-1.5 rounded-lg bg-white text-black hover:bg-zinc-200 transition-colors cursor-pointer font-medium"
                >
                  Re-connect Google
                </button>
              </div>
            </div>
          )}

          {/* Success Results */}
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
                <div className="py-8 text-center space-y-2 rounded-xl bg-zinc-900/40 border border-dashed border-zinc-800">
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
                        className="p-3.5 rounded-xl bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 transition-colors space-y-2"
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

                        <div className="flex items-center justify-between pt-1 text-[11px] text-zinc-500 border-t border-zinc-800/80">
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
        <div className="flex items-center justify-between px-6 py-3.5 bg-[#0c0c0e] border-t border-zinc-850">
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

  return createPortal(modalContent, document.body)
}
