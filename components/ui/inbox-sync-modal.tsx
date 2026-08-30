'use client'

import { useState, useEffect, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import {
  Mail,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Calendar,
  X,
  Inbox,
  CheckSquare,
  Square,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Link2,
  Search,
} from 'lucide-react'
import {
  scanGmailInboxPreviewAction,
  applyInboxUpdatesAction,
  checkGmailConnectionStatus,
  SyncCandidateItem,
} from '@/app/actions'
import { linkSocial, signIn } from '@/lib/auth-client'
import { ApplicationStatus } from '@prisma/client'
import { CompanyLogo } from '@/components/ui/avatars'

interface InboxSyncModalProps {
  isOpen: boolean
  onClose: () => void
}

interface ExistingAppOption {
  id: string
  companyName: string
  roleTitle: string
  status: ApplicationStatus
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
  const [isScanning, startScanTransition] = useTransition()
  const [isApplying, startApplyTransition] = useTransition()
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false)
  const [isGoogleConnected, setIsGoogleConnected] = useState<boolean | null>(null)
  const [candidates, setCandidates] = useState<SyncCandidateItem[]>([])
  const [existingApps, setExistingApps] = useState<ExistingAppOption[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [expandedEmailId, setExpandedEmailId] = useState<string | null>(null)
  const [activePickerCandidateId, setActivePickerCandidateId] = useState<string | null>(null)
  const [pickerSearch, setPickerSearch] = useState('')
  const [totalScanned, setTotalScanned] = useState(0)
  const [appliedStats, setAppliedStats] = useState<{ updated: number; created: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [hasScanned, setHasScanned] = useState(false)

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
    } catch {
      await signIn.social({
        provider: 'google',
        callbackURL: window.location.href,
      })
    } finally {
      setIsConnectingGoogle(false)
    }
  }

  function handleStartScan() {
    setError(null)
    setHasScanned(true)
    setAppliedStats(null)
    setExpandedEmailId(null)
    setActivePickerCandidateId(null)
    startScanTransition(async () => {
      try {
        const res = await scanGmailInboxPreviewAction({ daysBack: 14 })
        if (!res.success) {
          setError(res.error || 'Failed to scan inbox.')
          if (res.error?.includes('No Google account connected') || res.error?.includes('permission')) {
            setIsGoogleConnected(false)
          }
        } else {
          // Filter out client-side dismissed message IDs
          let dismissedIds: string[] = []
          try {
            const raw = localStorage.getItem('hyir_dismissed_emails')
            if (raw) dismissedIds = JSON.parse(raw)
          } catch {}

          const filteredItems = res.items.filter((item) => !dismissedIds.includes(item.messageId))
          setCandidates(filteredItems)
          setExistingApps(res.existingApplications || [])
          setTotalScanned(res.totalScanned)
          // Default selection: select matching existing applications
          const initialSelected = new Set<string>()
          for (const item of filteredItems) {
            if (item.selected) {
              initialSelected.add(item.id)
            }
          }
          setSelectedIds(initialSelected)
          setIsGoogleConnected(true)
        }
      } catch (err: any) {
        setError(err?.message || 'Something went wrong during inbox scan.')
      }
    })
  }

  function handleDismissItem(candidateId: string, messageId: string) {
    setCandidates((prev) => prev.filter((c) => c.id !== candidateId))
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.delete(candidateId)
      return next
    })
    try {
      const raw = localStorage.getItem('hyir_dismissed_emails')
      const existing: string[] = raw ? JSON.parse(raw) : []
      if (!existing.includes(messageId)) {
        existing.push(messageId)
        localStorage.setItem('hyir_dismissed_emails', JSON.stringify(existing))
      }
    } catch {}
  }

  function toggleItemSelection(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function handleLinkAppChange(candidateId: string, targetAppId: string) {
    setCandidates((prev) =>
      prev.map((c) => {
        if (c.id !== candidateId) return c

        if (targetAppId === '__NEW__') {
          return {
            ...c,
            actionType: 'CREATE_NEW',
            matchedApplicationId: undefined,
          }
        }

        const chosenApp = existingApps.find((a) => a.id === targetAppId)
        if (!chosenApp) return c

        // Auto-select when manually linked
        setSelectedIds((s) => new Set(s).add(candidateId))

        return {
          ...c,
          actionType: 'UPDATE_EXISTING',
          matchedApplicationId: chosenApp.id,
          companyName: chosenApp.companyName,
          roleTitle: chosenApp.roleTitle,
          previousStatus: chosenApp.status,
        }
      })
    )
    setActivePickerCandidateId(null)
    setPickerSearch('')
  }

  function toggleExpandEmail(id: string) {
    setExpandedEmailId((prev) => (prev === id ? null : id))
  }

  function toggleAppPicker(candidateId: string) {
    setActivePickerCandidateId((prev) => (prev === candidateId ? null : candidateId))
    setPickerSearch('')
  }

  function handleSelectAll() {
    if (selectedIds.size === candidates.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(candidates.map((c) => c.id)))
    }
  }

  function handleApplySelected() {
    const itemsToApply = candidates.filter((c) => selectedIds.has(c.id))
    if (itemsToApply.length === 0) return

    startApplyTransition(async () => {
      try {
        const res = await applyInboxUpdatesAction(itemsToApply)
        if (res.success) {
          setAppliedStats({ updated: res.updatedCount, created: res.createdCount })
          router.refresh()
        } else {
          setError(res.error || 'Failed to apply updates.')
        }
      } catch (err: any) {
        setError(err?.message || 'Error applying updates.')
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
        className="relative z-10 w-full max-w-2xl bg-[#09090b] border border-zinc-800 rounded-2xl shadow-2xl shadow-black overflow-hidden flex flex-col max-h-[88vh] animate-in fade-in zoom-in-95 duration-150"
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
          {isNotConnected && !isScanning && (
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
          {!isNotConnected && !hasScanned && !isScanning && !appliedStats && (
            <div className="text-center py-8 space-y-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-zinc-900/90 border border-zinc-800 flex items-center justify-center text-zinc-300 shadow-inner">
                <Inbox className="w-7 h-7 text-zinc-400" />
              </div>
              <div className="max-w-sm mx-auto space-y-1.5">
                <h4 className="text-sm font-medium text-zinc-200">
                  Ready to scan your recent job emails
                </h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Hyir will inspect emails from the last 14 days. You can <strong>read the full emails</strong>, link items to existing applications with logos, and confirm updates before applying.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleStartScan}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-semibold shadow-md transition-all cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Start Inbox Scan</span>
                </button>
              </div>
            </div>
          )}

          {/* Pending Progress */}
          {(isScanning || isApplying) && (
            <div className="py-12 text-center space-y-3">
              <Loader2 className="w-8 h-8 mx-auto text-amber-400 animate-spin" />
              <p className="text-xs font-medium text-zinc-200">
                {isScanning ? 'Scanning recent emails & matching applications...' : 'Applying selected updates to your pipeline...'}
              </p>
              <p className="text-[11px] text-zinc-500">
                {isScanning ? 'Finding matching applications and decoding messages...' : 'Updating stage and logging activity timeline...'}
              </p>
            </div>
          )}

          {/* Error State */}
          {error && !isScanning && !isApplying && !isNotConnected && (
            <div className="p-4 rounded-xl bg-red-950/60 border border-red-800/60 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-red-300">
                <AlertCircle className="w-4 h-4" />
                <span>Inbox Sync Notice</span>
              </div>
              <p className="text-xs text-red-200/90 leading-relaxed">{error}</p>
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleStartScan}
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

          {/* Applied Success State */}
          {appliedStats && !isApplying && (
            <div className="py-8 text-center space-y-3 rounded-xl bg-emerald-950/20 border border-emerald-800/40 p-6">
              <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-400" />
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-zinc-100">
                  Updates Successfully Applied!
                </h4>
                <p className="text-xs text-zinc-400">
                  Updated <strong>{appliedStats.updated}</strong> application(s) and created <strong>{appliedStats.created}</strong> new draft(s).
                </p>
              </div>
              <div className="pt-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-semibold shadow-md transition-all cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          )}

          {/* Candidate Review List */}
          {hasScanned && !isScanning && !appliedStats && !error && (
            <div className="space-y-4">
              {/* Header & Controls */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">
                    Discovered Updates ({candidates.length})
                  </h4>
                  <p className="text-[11px] text-zinc-400">
                    Scanned {totalScanned} emails. Link to existing jobs or check to apply.
                  </p>
                </div>
                {candidates.length > 0 && (
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  >
                    {selectedIds.size === candidates.length ? 'Deselect All' : 'Select All'}
                  </button>
                )}
              </div>

              {candidates.length === 0 ? (
                <div className="py-8 text-center space-y-2 rounded-xl bg-zinc-900/40 border border-dashed border-zinc-800">
                  <CheckCircle2 className="w-6 h-6 mx-auto text-zinc-500" />
                  <p className="text-xs text-zinc-400 font-medium">
                    No relevant job updates found in recent emails.
                  </p>
                  <p className="text-[11px] text-zinc-500">Your job pipeline is up to date!</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[52vh] overflow-y-auto pr-1">
                  {candidates.map((item, idx) => {
                    const isSelected = selectedIds.has(item.id)
                    const isExpanded = expandedEmailId === item.id
                    const isPickerOpen = activePickerCandidateId === item.id
                    const isUpdate = item.actionType === 'UPDATE_EXISTING'
                    const matchedApp = existingApps.find((a) => a.id === item.matchedApplicationId)
                    const senderDisplay =
                      item.recruiterName || item.fromName || item.recruiterEmail || item.fromEmail || 'Recruiter'

                    const filteredApps = existingApps.filter(
                      (a) =>
                        a.companyName.toLowerCase().includes(pickerSearch.toLowerCase()) ||
                        a.roleTitle.toLowerCase().includes(pickerSearch.toLowerCase())
                    )

                    return (
                      <div
                        key={`${item.id}-${idx}`}
                        className={`rounded-xl border transition-all ${
                          isSelected
                            ? 'bg-zinc-900/90 border-zinc-750 shadow-xs'
                            : 'bg-zinc-950/40 border-zinc-850 opacity-80 hover:opacity-100 hover:border-zinc-800'
                        }`}
                      >
                        {/* Main Item Row */}
                        <div className="p-3.5 space-y-2.5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              {/* Checkbox */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  toggleItemSelection(item.id)
                                }}
                                className="text-zinc-400 hover:text-white shrink-0 p-0.5 cursor-pointer"
                                aria-label="Select update"
                              >
                                {isSelected ? (
                                  <CheckSquare className="w-4 h-4 text-amber-400" />
                                ) : (
                                  <Square className="w-4 h-4 text-zinc-600" />
                                )}
                              </button>

                              {/* Company Logo */}
                              <CompanyLogo name={item.companyName} className="w-6 h-6 shrink-0" />

                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-xs text-zinc-100 truncate">
                                    {item.companyName}
                                  </span>
                                  {item.roleTitle && (
                                    <span className="text-[11px] text-zinc-400 truncate">
                                      · {item.roleTitle}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {isUpdate ? (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-950 text-emerald-300 border border-emerald-800/50">
                                  Matched App
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-zinc-800 text-zinc-400 border border-zinc-700">
                                  New Draft
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

                              {/* Dismiss Button */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDismissItem(item.id, item.messageId)
                                }}
                                className="p-1 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/80 transition-colors cursor-pointer"
                                title="Dismiss this email"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <p className="text-xs text-zinc-300 leading-relaxed font-normal pl-6.5">
                            {item.summary}
                          </p>

                          {/* Inline Link to Application Trigger */}
                          <div className="pl-6.5 pt-0.5 space-y-2">
                            <div className="flex items-center gap-2">
                              <Link2 className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                              <span className="text-[11px] text-zinc-400 shrink-0 font-medium">
                                Link to:
                              </span>

                              <button
                                type="button"
                                onClick={() => toggleAppPicker(item.id)}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs transition-colors cursor-pointer max-w-[320px] ${
                                  isPickerOpen
                                    ? 'bg-zinc-800 border-zinc-600 text-white'
                                    : 'bg-zinc-900 hover:bg-zinc-850 border-zinc-800 text-zinc-200'
                                }`}
                              >
                                {matchedApp ? (
                                  <>
                                    <CompanyLogo
                                      name={matchedApp.companyName}
                                      className="w-4 h-4 rounded shrink-0"
                                    />
                                    <span className="font-semibold text-zinc-100 truncate">
                                      {matchedApp.companyName}
                                    </span>
                                    {matchedApp.roleTitle && (
                                      <span className="text-zinc-400 truncate text-[11px]">
                                        ({matchedApp.roleTitle})
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  <>
                                    <span className="text-zinc-400">➕</span>
                                    <span className="text-zinc-300 truncate">Create as New Draft</span>
                                  </>
                                )}
                                {isPickerOpen ? (
                                  <ChevronUp className="w-3.5 h-3.5 text-zinc-400 shrink-0 ml-1" />
                                ) : (
                                  <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0 ml-1" />
                                )}
                              </button>
                            </div>

                            {/* Inline Application Picker Drawer (Never clipped!) */}
                            {isPickerOpen && (
                              <div className="p-2 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2 animate-in fade-in duration-150">
                                {existingApps.length > 5 && (
                                  <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800">
                                    <Search className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                    <input
                                      type="text"
                                      value={pickerSearch}
                                      onChange={(e) => setPickerSearch(e.target.value)}
                                      placeholder="Search your applications..."
                                      className="w-full bg-transparent text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none"
                                      autoFocus
                                    />
                                  </div>
                                )}

                                <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                                  {/* Create New Draft Option */}
                                  <button
                                    type="button"
                                    onClick={() => handleLinkAppChange(item.id, '__NEW__')}
                                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left ${
                                      !item.matchedApplicationId
                                        ? 'bg-zinc-800 text-white font-medium'
                                        : 'text-zinc-300 hover:bg-zinc-900 hover:text-white'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className="text-zinc-400">➕</span>
                                      <span className="truncate">Create as New Application Draft</span>
                                    </div>
                                    {!item.matchedApplicationId && (
                                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                    )}
                                  </button>

                                  <div className="px-2 py-1 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                                    Your Applications ({existingApps.length})
                                  </div>

                                  {filteredApps.map((app) => {
                                    const isCurr = app.id === item.matchedApplicationId
                                    return (
                                      <button
                                        key={app.id}
                                        type="button"
                                        onClick={() => handleLinkAppChange(item.id, app.id)}
                                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left ${
                                          isCurr
                                            ? 'bg-zinc-800 text-white font-medium'
                                            : 'text-zinc-300 hover:bg-zinc-900 hover:text-white'
                                        }`}
                                      >
                                        <div className="flex items-center gap-2 min-w-0">
                                          <CompanyLogo
                                            name={app.companyName}
                                            className="w-4 h-4 rounded shrink-0"
                                          />
                                          <div className="min-w-0 truncate">
                                            <span className="font-medium text-zinc-200">
                                              {app.companyName}
                                            </span>
                                            {app.roleTitle && (
                                              <span className="text-zinc-500 text-[11px] ml-1.5 truncate">
                                                ({app.roleTitle})
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                        {isCurr && (
                                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                        )}
                                      </button>
                                    )
                                  })}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Email metadata bar with expand toggle */}
                          <div className="flex items-center justify-between pt-1 text-[11px] text-zinc-500 border-t border-zinc-850 pl-6.5">
                            <span className="truncate max-w-[240px]">
                              Email: &quot;{item.originalSubject}&quot;
                            </span>

                            <div className="flex items-center gap-2 shrink-0">
                              {item.interviewDateTime && (
                                <span className="inline-flex items-center gap-1 text-amber-400 font-medium text-[10px]">
                                  <Calendar className="w-3 h-3" />
                                  Calendar Sync
                                </span>
                              )}

                              <button
                                type="button"
                                onClick={() => toggleExpandEmail(item.id)}
                                className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-400 hover:text-white bg-zinc-800/60 hover:bg-zinc-800 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                              >
                                <span>{isExpanded ? 'Hide Email' : 'Read Email'}</span>
                                {isExpanded ? (
                                  <ChevronUp className="w-3 h-3" />
                                ) : (
                                  <ChevronDown className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Expandable Full Email Reader */}
                        {isExpanded && (
                          <div className="border-t border-zinc-800 bg-[#060608] p-4 space-y-3 animate-in fade-in duration-150">
                            <div className="flex items-center justify-between gap-2 text-xs">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <CompanyLogo name={item.companyName} className="w-7 h-7 shrink-0" />
                                <div className="space-y-0.5 min-w-0">
                                  <div className="text-zinc-300 font-medium truncate">
                                    <span className="text-zinc-500">From: </span>
                                    <span>{senderDisplay}</span>
                                    {(item.recruiterEmail || item.fromEmail) && (
                                      <span className="text-zinc-500 ml-1">
                                        &lt;{item.recruiterEmail || item.fromEmail}&gt;
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-zinc-500">
                                    <span>Subject: </span>
                                    <span className="text-zinc-400 font-medium">
                                      {item.originalSubject}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <a
                                href={`https://mail.google.com/mail/u/0/#inbox/${item.threadId || item.messageId}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 shrink-0 bg-cyan-950/40 border border-cyan-800/50 px-2.5 py-1 rounded-lg transition-colors"
                              >
                                <span>Open in Gmail</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>

                            {/* Email Body Viewer */}
                            <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-850/80 max-h-56 overflow-y-auto text-xs text-zinc-300 leading-relaxed font-sans whitespace-pre-wrap selection:bg-zinc-800">
                              {item.emailBody || item.emailSnippet || 'No email body available.'}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
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
            {hasScanned && candidates.length > 0 && !appliedStats && !isScanning && !isApplying && (
              <button
                type="button"
                disabled={selectedIds.size === 0}
                onClick={handleApplySelected}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-semibold shadow-md transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span>Apply Selected ({selectedIds.size})</span>
                <ArrowRight className="w-3.5 h-3.5" />
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
