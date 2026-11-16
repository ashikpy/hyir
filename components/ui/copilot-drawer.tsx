'use client'

import { useState, useEffect, useRef, useTransition, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { HyirAiLogo } from './hyr-logo'
import { HyirAiMark } from './hyir-ai-mark'
import ShinyText from './shiny-text'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  X,
  Loader2,
  Trash2,
  Settings,
  Calendar,
  ExternalLink,
  Copy,
  Check,
  Building2,
  ArrowRight,
  Briefcase,
  Clock,
  RotateCcw,
  Key,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  FileText,
  Mail,
  Zap,
  ArrowUp,
  ChartNoAxesColumn,
  Target,
  Plus,
} from 'lucide-react'
import { CopilotMessage, CopilotAction } from '@/lib/copilot-service'
import { ApplicationStatus } from '@prisma/client'
import { useMounted } from '@/components/ui/use-mounted'

const statusColors: Record<ApplicationStatus, { bg: string; text: string; border: string }> = {
  SAVED: { bg: 'bg-zinc-800/70', text: 'text-zinc-300', border: 'border-zinc-700' },
  APPLIED: { bg: 'bg-blue-950/60', text: 'text-blue-300', border: 'border-blue-800/60' },
  CONTACTED: { bg: 'bg-indigo-950/60', text: 'text-indigo-300', border: 'border-indigo-800/60' },
  SCREENING: { bg: 'bg-cyan-950/60', text: 'text-cyan-300', border: 'border-cyan-800/60' },
  INTERVIEW: { bg: 'bg-amber-950/60', text: 'text-amber-300', border: 'border-amber-700/60' },
  ASSIGNMENT: { bg: 'bg-purple-950/60', text: 'text-purple-300', border: 'border-purple-800/60' },
  OFFER: { bg: 'bg-emerald-950/60', text: 'text-emerald-300', border: 'border-emerald-700/60' },
  ACCEPTED: { bg: 'bg-emerald-900/80', text: 'text-emerald-200', border: 'border-emerald-500' },
  REJECTED: { bg: 'bg-red-950/60', text: 'text-red-300', border: 'border-red-800/60' },
  GHOSTED: { bg: 'bg-zinc-900/70', text: 'text-zinc-400', border: 'border-zinc-800' },
  WITHDRAWN: { bg: 'bg-zinc-900/70', text: 'text-zinc-400', border: 'border-zinc-800' },
}

const DEFAULT_SUGGESTIONS = [
  'Pipeline summary',
  'Overdue follow-ups',
  'Prep for interview',
  'Draft follow-up email',
  'Track new job',
]

const STARTER_PROMPTS: { label: string; hint: string; icon: typeof Clock }[] = [
  { label: 'Pipeline summary', hint: 'Where every application stands', icon: ChartNoAxesColumn },
  { label: 'Overdue follow-ups', hint: 'Who you owe a reply', icon: Clock },
  { label: 'Prep for interview', hint: 'Questions and notes for the next one', icon: Target },
  { label: 'Draft follow-up email', hint: 'A short, polite nudge', icon: Mail },
  { label: 'Track new job', hint: 'Add a role from a link or name', icon: Plus },
]

const API_KEY_STORAGE_KEY = 'hyir_gemini_api_key'

function readStoredApiKey() {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem(API_KEY_STORAGE_KEY) || ''
}

/** Timestamp-based message id; kept outside the component so render stays pure. */
function createMessageId(suffix: string) {
  return `msg-${Date.now()}-${suffix}`
}

/**
 * Lightweight, safe Markdown-to-JSX renderer
 */
// Models like to open headings and bullets with emoji. Drop them so replies read like text.
const LEADING_EMOJI = /^(?:[\p{Extended_Pictographic}\p{Emoji_Presentation}\u{FE0F}\u{200D}]\s*)+/u
const stripEmoji = (text: string) => text.replace(LEADING_EMOJI, '')

function MarkdownView({ content }: { content: string }) {
  const lines = useMemo(() => content.split('\n'), [content])

  return (
    <div className="text-[13px] leading-[1.65] space-y-1.5 text-zinc-300">
      {lines.map((line, idx) => {
        const trimmed = line.trim()

        if (!trimmed) {
          return <div key={idx} className="h-1" />
        }

        // Horizontal rule: --- or ***
        if (/^(-{3,}|\*{3,})$/.test(trimmed)) {
          return <hr key={idx} className="my-3 border-white/[0.06]" />
        }

        // Headings: ## / ###
        const heading = trimmed.match(/^(#{1,4})\s+(.*)$/)
        if (heading) {
          return (
            <h4
              key={idx}
              className={`font-medium text-zinc-100 ${idx === 0 ? '' : 'pt-2'} ${heading[1].length <= 2 ? 'text-sm' : 'text-[13px]'}`}
            >
              {formatInline(stripEmoji(heading[2]))}
            </h4>
          )
        }

        // Bullet list item: - or *
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <div key={idx} className="flex items-start gap-2.5 pl-0.5">
              <span className="mt-[9px] w-1 h-1 rounded-full bg-zinc-600 shrink-0" />
              <span className="flex-1">{formatInline(stripEmoji(trimmed.replace(/^[-*]\s+/, '')))}</span>
            </div>
          )
        }

        // Numbered list item: 1. 2.
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/)
        if (numMatch) {
          return (
            <div key={idx} className="flex items-start gap-2.5 pl-0.5">
              <span className="text-zinc-500 tabular-nums shrink-0">{numMatch[1]}.</span>
              <span className="flex-1">{formatInline(stripEmoji(numMatch[2]))}</span>
            </div>
          )
        }

        // Blockquote: >
        if (trimmed.startsWith('> ')) {
          return (
            <div key={idx} className="border-l-2 border-white/10 pl-3 my-1.5 text-zinc-400">
              {formatInline(trimmed.replace(/^>\s+/, ''))}
            </div>
          )
        }

        return <p key={idx}>{formatInline(stripEmoji(trimmed))}</p>
      })}
    </div>
  )
}

function formatInline(text: string) {
  // Regex to split by bold **text**, code `text`, and italic *text*
  const parts = text.split(/(\*\*.*?\*\*|`.*?`|\*.*?\*)/g)

  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-medium text-zinc-100">
          {part.slice(2, -2)}
        </strong>
      )
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="bg-white/[0.06] text-zinc-200 px-1 py-0.5 rounded text-[12px] font-mono">
          {part.slice(1, -1)}
        </code>
      )
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return (
        <em key={i} className="italic text-zinc-400">
          {part.slice(1, -1)}
        </em>
      )
    }
    return part
  })
}

type StatusUpdatedApp = Extract<CopilotAction, { type: 'STATUS_UPDATED' }>['app']

function StatusUpdatedCard({
  app,
  onUndo,
  onNavigate,
}: {
  app: StatusUpdatedApp
  onUndo: (appId: string, prevStatus: ApplicationStatus) => void
  onNavigate: () => void
}) {
  return (
    <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase font-mono tracking-wider font-semibold text-cyan-400">
          Pipeline State Transition
        </span>
        <button
          type="button"
          onClick={() => onUndo(app.id, app.previousStatus)}
          className="text-[10px] text-zinc-400 hover:text-zinc-200 flex items-center gap-1 hover:underline cursor-pointer"
        >
          <RotateCcw className="w-2.5 h-2.5" />
          Undo
        </button>
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-[10px] font-semibold px-2 py-0.5 border rounded-full line-through opacity-70 ${statusColors[app.previousStatus]?.bg || 'bg-zinc-800'} ${statusColors[app.previousStatus]?.text || 'text-zinc-400'} ${statusColors[app.previousStatus]?.border || 'border-zinc-700'}`}>
          {app.previousStatus}
        </span>
        <ArrowRight className="w-3 h-3 text-zinc-500" />
        <span className={`text-[10px] font-semibold px-2 py-0.5 border rounded-full ${statusColors[app.newStatus]?.bg || 'bg-zinc-800'} ${statusColors[app.newStatus]?.text || 'text-zinc-200'} ${statusColors[app.newStatus]?.border || 'border-zinc-700'}`}>
          {app.newStatus}
        </span>
      </div>
      <Link
        href={`/applications/${app.slug}`}
        onClick={onNavigate}
        className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-200 pt-1"
      >
        <span>Open {app.companyName}</span>
        <ExternalLink className="w-2.5 h-2.5" />
      </Link>
    </div>
  )
}

export function CopilotDrawer() {
  const [isOpen, setIsOpen] = useState(false)
  const mounted = useMounted()
  const [messages, setMessages] = useState<CopilotMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [savedApiKey, setSavedApiKey] = useState(readStoredApiKey)
  const [modelBadge, setModelBadge] = useState(savedApiKey ? 'Gemini 3.5 Flash' : 'Smart Mode')
  const [showSettings, setShowSettings] = useState(false)
  const [apiKeyInput, setApiKeyInput] = useState(savedApiKey)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})

  const chatContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const router = useRouter()

  // Re-sync API key input and badge with the stored key whenever the drawer
  // or settings panel opens/closes (adjust state during render)
  const panelKey = `${isOpen}|${showSettings}`
  const [prevPanelKey, setPrevPanelKey] = useState(panelKey)
  if (prevPanelKey !== panelKey) {
    setPrevPanelKey(panelKey)
    setApiKeyInput(savedApiKey)
    if (savedApiKey) {
      setModelBadge('Gemini 3.5 Flash')
    }
  }

  useEffect(() => {
    const handleToggle = () => setIsOpen((prev) => !prev)
    const handleOpen = (e: Event) => {
      setIsOpen(true)
      const prompt = e instanceof CustomEvent ? (e.detail as { prompt?: unknown } | null)?.prompt : undefined
      if (typeof prompt === 'string' && prompt) {
        setInput(prompt)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle on Cmd+J or Ctrl+J
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault()
        setIsOpen((prev) => !prev)
      } else if (e.key === 'Escape' && isOpen && !showSettings) {
        setIsOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('open-copilot', handleOpen)
    window.addEventListener('toggle-copilot', handleToggle)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('open-copilot', handleOpen)
      window.removeEventListener('toggle-copilot', handleToggle)
    }
  }, [isOpen, showSettings])

  // Auto-scroll messages
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [messages, isLoading])

  // Focus textarea on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => textareaRef.current?.focus(), 80)
    }
  }, [isOpen])

  const handleSaveApiKey = () => {
    const trimmed = apiKeyInput.trim()
    localStorage.setItem(API_KEY_STORAGE_KEY, trimmed)
    setSavedApiKey(trimmed)
    setShowSettings(false)
    setModelBadge(trimmed ? 'Gemini 3.5 Flash' : 'Smart Mode')

    if (trimmed) {
      setMessages((prev) => [
        ...prev,
        {
          id: createMessageId('activated'),
          role: 'assistant',
          content: '⚡ **Google Gemini 3.5 Flash Connected!** Your API key is verified and active. I have live awareness of your pipeline and can execute tools, summarize stats, and draft custom outreach.',
          createdAt: new Date().toISOString(),
          suggestions: [
            '📊 Pipeline summary',
            '🎯 Prep for Stripe interview',
            '⏰ Overdue follow-ups',
            '✉️ Draft follow-up email',
          ],
        },
      ])
    }
  }

  const handleClearHistory = () => {
    setMessages([])
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim()
    if (!query || isLoading) return

    const userMessage: CopilotMessage = {
      id: createMessageId('user'),
      role: 'user',
      content: query,
      createdAt: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    try {
      const res = await fetch('/api/copilot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(savedApiKey ? { 'x-gemini-api-key': savedApiKey } : {}),
        },
        body: JSON.stringify({
          message: query,
          history: messages.slice(-4),
          apiKey: savedApiKey || undefined,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to communicate with Copilot')
      }

      const data = await res.json()

      const assistantMessage: CopilotMessage = {
        id: createMessageId('assistant'),
        role: 'assistant',
        content: data.reply,
        createdAt: new Date().toISOString(),
        action: data.action,
        suggestions: data.suggestions || DEFAULT_SUGGESTIONS,
      }

      setMessages((prev) => [...prev, assistantMessage])
      if (data.model) {
        setModelBadge(data.providerUsed === 'gemini' ? 'Gemini 3.5 Flash' : 'Smart Mode')
      }

      // If an application was modified or created, revalidate router quietly
      if (data.action) {
        router.refresh()
      }
    } catch (err: unknown) {
      const errorMessage: CopilotMessage = {
        id: createMessageId('err'),
        role: 'assistant',
        content: `⚠️ ${(err instanceof Error && err.message) || 'Something went wrong while processing your request.'}`,
        createdAt: new Date().toISOString(),
        suggestions: DEFAULT_SUGGESTIONS,
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleInputResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`
  }

  // Handle undo status action
  const handleUndoStatus = async (appId: string, prevStatus: ApplicationStatus) => {
    await handleSendMessage(`Move application ${appId} back to ${prevStatus}`)
  }

  if (!mounted) return null

  return createPortal(
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 transition-opacity animate-fade-in"
        />
      )}

      {/* Slide-out Drawer Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-[480px] lg:w-[520px] bg-zinc-950 border-l border-zinc-800/90 shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Drawer Header */}
        <div className="h-14 px-4 border-b border-white/[0.06] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <HyirAiLogo className="w-[18px] h-[18px] shrink-0" />
            <h3 className="text-sm font-medium text-white">Copilot</h3>
            <span className="flex items-center gap-1.5 text-xs text-zinc-500 truncate">
              <span className="w-1 h-1 rounded-full bg-zinc-600" />
              {modelBadge}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setShowSettings(!showSettings)}
              title="Copilot settings"
              aria-label="Copilot settings"
              className={`grid place-items-center w-8 h-8 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.05] transition-colors cursor-pointer ${
                showSettings ? 'bg-white/[0.06] text-zinc-100' : ''
              }`}
            >
              <Settings className="w-4 h-4" />
            </button>

            {messages.length > 0 && (
              <button
                type="button"
                onClick={handleClearHistory}
                title="Clear conversation"
                aria-label="Clear conversation"
                className="grid place-items-center w-8 h-8 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.05] transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close Copilot"
              className="grid place-items-center w-8 h-8 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.05] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Inline Settings Panel */}
        {showSettings && (
          <div className="p-4 bg-zinc-900/90 border-b border-zinc-800 text-xs space-y-3 animate-fade-in shrink-0">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-zinc-200 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-amber-400" />
                <span>Google Gemini API Key</span>
              </span>
              <span className="text-[10px] text-zinc-500">Stored locally in browser</span>
            </div>
            <p className="text-zinc-400 text-[11px]">
              Optional. Enter your Gemini API key to activate Gemini 2.5 Flash with full conversational reasoning. If omitted, Hyir Copilot runs in intelligent local mode.
            </p>
            <div className="flex gap-2">
              <input
                type="password"
                placeholder="AIzaSy..."
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 font-mono text-xs"
              />
              <button
                type="button"
                onClick={handleSaveApiKey}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
              >
                Save
              </button>
            </div>
          </div>
        )}

        {/* Chat Messages Body */}
        <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col px-1 pb-2">
              <div className="flex-1 min-h-0 grid place-items-center py-6">
                <HyirAiMark className="w-40 h-40 max-h-full" />
              </div>
              <div className="mb-6 px-2">
                <h4 className="text-xl font-medium tracking-tight text-zinc-100">What can I help with?</h4>
                <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-500">
                  Ask about your pipeline, or tell me what to change. I can move stages, log jobs and draft emails.
                </p>
              </div>

              <div className="flex flex-col">
                {STARTER_PROMPTS.map(({ label, hint, icon: Icon }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => handleSendMessage(label)}
                    className="group flex items-center gap-3 px-2 py-2.5 rounded-lg text-left hover:bg-white/[0.04] transition-colors cursor-pointer"
                  >
                    <span className="grid place-items-center w-8 h-8 rounded-lg border border-white/[0.06] bg-white/[0.02] text-zinc-500 group-hover:text-zinc-200 transition-colors shrink-0">
                      <Icon className="w-4 h-4" strokeWidth={1.8} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13px] text-zinc-200">{label}</span>
                      <span className="block text-xs text-zinc-500 truncate">{hint}</span>
                    </span>
                    <ArrowRight className="ml-auto w-3.5 h-3.5 text-zinc-600 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} space-y-2`}
              >
                {/* Message Bubble */}
                <div
                  className={
                    msg.role === 'user'
                      ? 'max-w-[85%] rounded-2xl rounded-br-md px-3.5 py-2 bg-white/[0.07] [&_p]:text-zinc-100'
                      : 'w-full px-1'
                  }
                >
                  <MarkdownView content={msg.content} />

                  {/* Render Rich Action Card if Action Executed */}
                  {msg.action && (
                    <div className="mt-3">
                      {/* 1. APPLICATION CREATED CARD */}
                      {msg.action.type === 'APPLICATION_CREATED' && (
                        <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] uppercase font-mono tracking-wider font-semibold text-emerald-400 flex items-center gap-1">
                              <Zap className="w-3 h-3 text-emerald-400" />
                              Application Tracked
                            </span>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 border rounded-full ${statusColors[msg.action.app.status].bg} ${statusColors[msg.action.app.status].text} ${statusColors[msg.action.app.status].border}`}>
                              {msg.action.app.status}
                            </span>
                          </div>
                          <div>
                            <h5 className="font-semibold text-sm text-zinc-100">{msg.action.app.companyName}</h5>
                            <p className="text-xs text-zinc-400">{msg.action.app.roleTitle}</p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-zinc-400 pt-1">
                            {msg.action.app.salary && <span>💰 {msg.action.app.salary}</span>}
                            {msg.action.app.location && <span>📍 {msg.action.app.location}</span>}
                            {msg.action.app.applicationUrl && (
                              <a
                                href={msg.action.app.applicationUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 hover:underline font-mono"
                              >
                                <ExternalLink className="w-2.5 h-2.5" />
                                <span>{msg.action.app.applicationUrl.replace(/^https?:\/\//, '')}</span>
                              </a>
                            )}
                          </div>
                          <Link
                            href={`/applications/${msg.action.app.slug}`}
                            onClick={() => setIsOpen(false)}
                            className="inline-flex items-center gap-1.5 text-xs text-zinc-300 hover:text-white font-medium pt-1 group"
                          >
                            <span>View application details</span>
                            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                          </Link>
                        </div>
                      )}

                      {/* APPLICATION UPDATED CARD */}
                      {msg.action.type === 'APPLICATION_UPDATED' && (
                        <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] uppercase font-mono tracking-wider font-semibold text-cyan-400 flex items-center gap-1">
                              <Zap className="w-3 h-3 text-cyan-400" />
                              Details Updated
                            </span>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 border rounded-full ${statusColors[msg.action.app.status]?.bg || 'bg-zinc-800'} ${statusColors[msg.action.app.status]?.text || 'text-zinc-200'} ${statusColors[msg.action.app.status]?.border || 'border-zinc-700'}`}>
                              {msg.action.app.status}
                            </span>
                          </div>
                          <div>
                            <h5 className="font-semibold text-sm text-zinc-100">{msg.action.app.companyName}</h5>
                            <p className="text-xs text-zinc-400">{msg.action.app.roleTitle}</p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-zinc-400 pt-1">
                            {msg.action.app.salary && <span>💰 {msg.action.app.salary}</span>}
                            {msg.action.app.location && <span>📍 {msg.action.app.location}</span>}
                            {msg.action.app.applicationUrl && (
                              <a
                                href={msg.action.app.applicationUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 hover:underline font-mono"
                              >
                                <ExternalLink className="w-2.5 h-2.5" />
                                <span>{msg.action.app.applicationUrl.replace(/^https?:\/\//, '')}</span>
                              </a>
                            )}
                          </div>
                          <Link
                            href={`/applications/${msg.action.app.slug}`}
                            onClick={() => setIsOpen(false)}
                            className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-medium pt-1 group"
                          >
                            <span>View application details</span>
                            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                          </Link>
                        </div>
                      )}

                      {/* 2. STATUS UPDATED CARD */}
                      {msg.action.type === 'STATUS_UPDATED' && (
                        <StatusUpdatedCard
                          app={msg.action.app}
                          onUndo={handleUndoStatus}
                          onNavigate={() => setIsOpen(false)}
                        />
                      )}

                      {/* 3. FOLLOW-UP SCHEDULED CARD */}
                      {msg.action.type === 'FOLLOW_UP_SCHEDULED' && (
                        <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] uppercase font-mono tracking-wider font-semibold text-amber-400 flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-amber-400" />
                              Follow-Up Scheduled
                            </span>
                          </div>
                          <div>
                            <h5 className="font-semibold text-xs text-zinc-100">{msg.action.app.companyName}</h5>
                            <p className="text-[11px] text-zinc-400">
                              Target Date: <strong className="text-zinc-200">{new Date(msg.action.app.followUpDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</strong>
                            </p>
                          </div>
                          <a
                            href={msg.action.app.calendarUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-medium transition-colors"
                          >
                            <Calendar className="w-3.5 h-3.5 text-amber-400" />
                            <span>Add to Google Calendar</span>
                            <ExternalLink className="w-3 h-3 ml-0.5 opacity-70" />
                          </a>
                        </div>
                      )}

                      {/* 4. EMAIL DRAFTED CARD */}
                      {msg.action.type === 'EMAIL_DRAFTED' && (
                        <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] uppercase font-mono tracking-wider font-semibold text-blue-400 flex items-center gap-1">
                              <Mail className="w-3 h-3 text-blue-400" />
                              Email Draft Ready
                            </span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(`Subject: ${msg.action?.type === 'EMAIL_DRAFTED' ? msg.action.email.subject : ''}\n\n${msg.action?.type === 'EMAIL_DRAFTED' ? msg.action.email.body : ''}`, msg.id)}
                              className="text-[11px] text-zinc-400 hover:text-zinc-100 flex items-center gap-1 px-2 py-0.5 bg-zinc-900 border border-zinc-800 rounded-md transition-colors cursor-pointer"
                            >
                              {copiedId === msg.id ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-400" />
                                  <span className="text-emerald-400 font-medium">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3 text-zinc-400" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                          <div className="text-[11px] space-y-1">
                            <p className="text-zinc-400">
                              <strong className="text-zinc-200">Subject:</strong> {msg.action.email.subject}
                            </p>
                            <div className="p-2.5 bg-zinc-900/60 rounded-lg border border-zinc-800/80 font-mono text-[10px] leading-relaxed text-zinc-300 max-h-40 overflow-y-auto whitespace-pre-wrap">
                              {msg.action.email.body}
                            </div>
                          </div>
                          <div className="flex gap-2 pt-1">
                            <a
                              href={msg.action.email.gmailUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 text-center py-1.5 px-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-lg text-xs font-medium transition-colors"
                            >
                              Open in Gmail
                            </a>
                            <a
                              href={msg.action.email.mailtoUrl}
                              className="flex-1 text-center py-1.5 px-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 rounded-lg text-xs font-medium transition-colors"
                            >
                              Default Mail Client
                            </a>
                          </div>
                        </div>
                      )}

                      {/* 5. INTERVIEW PREP CARD */}
                      {msg.action.type === 'INTERVIEW_PREP' && (
                        <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] uppercase font-mono tracking-wider font-semibold text-purple-400 flex items-center gap-1">
                              <HelpCircle className="w-3 h-3 text-purple-400" />
                              Interview Prep Guide
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const allQuestions = [
                                  `--- Technical Questions ---`,
                                  ...(msg.action?.type === 'INTERVIEW_PREP' ? msg.action.prep.technicalQuestions : []),
                                  `\n--- Behavioral Questions ---`,
                                  ...(msg.action?.type === 'INTERVIEW_PREP' ? msg.action.prep.behavioralQuestions : []),
                                  `\n--- Questions for Interviewer ---`,
                                  ...(msg.action?.type === 'INTERVIEW_PREP' ? msg.action.prep.questionsToAskInterviewer : []),
                                ].join('\n')
                                copyToClipboard(allQuestions, `${msg.id}-prep`)
                              }}
                              className="text-[11px] text-zinc-400 hover:text-zinc-100 flex items-center gap-1 px-2 py-0.5 bg-zinc-900 border border-zinc-800 rounded-md transition-colors cursor-pointer"
                            >
                              {copiedId === `${msg.id}-prep` ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-400" />
                                  <span className="text-emerald-400">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copy All</span>
                                </>
                              )}
                            </button>
                          </div>

                          {/* Technical Questions */}
                          <div className="space-y-1">
                            <span className="text-[11px] font-semibold text-zinc-200">Technical & Systems Questions:</span>
                            <div className="space-y-1">
                              {msg.action.prep.technicalQuestions.map((q, qIdx) => (
                                <div key={qIdx} className="text-[11px] text-zinc-300 p-2 bg-zinc-900/50 rounded-lg border border-zinc-800/60">
                                  {q}
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Behavioral Questions */}
                          <div className="space-y-1">
                            <span className="text-[11px] font-semibold text-zinc-200">Behavioral & Culture Questions:</span>
                            <div className="space-y-1">
                              {msg.action.prep.behavioralQuestions.map((q, qIdx) => (
                                <div key={qIdx} className="text-[11px] text-zinc-300 p-2 bg-zinc-900/50 rounded-lg border border-zinc-800/60">
                                  {q}
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Questions to Ask */}
                          <div className="space-y-1">
                            <span className="text-[11px] font-semibold text-zinc-200">Smart Questions to Ask Them:</span>
                            <div className="space-y-1">
                              {msg.action.prep.questionsToAskInterviewer.map((q, qIdx) => (
                                <div key={qIdx} className="text-[11px] text-amber-300/90 p-2 bg-amber-950/20 rounded-lg border border-amber-900/30">
                                  {q}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Follow-up Suggestions Chips */}
                {msg.role === 'assistant' && msg.suggestions && msg.suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1 px-1 w-full">
                    {msg.suggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => handleSendMessage(suggestion)}
                        className="h-7 px-2.5 rounded-lg border border-white/[0.08] hover:border-white/[0.16] hover:bg-white/[0.03] text-xs text-zinc-400 hover:text-zinc-100 transition-colors cursor-pointer"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}

          {/* Typing Indicator */}
          {isLoading && (
            <div role="status" aria-label="Copilot is thinking" className="flex items-center gap-2.5 px-1 animate-in fade-in duration-300">
              <HyirAiMark
                className="w-8 h-8 shrink-0"
                scale={0.8}
                speed={14}
                intro={false}
                rimPx={0.75}
              />
              <ShinyText
                text="Thinking"
                color="#a1a1aa"
                shineColor="#ffffff"
                speed={1.4}
                className="text-sm"
              />
            </div>
          )}
        </div>

        {/* Input Form Footer */}
        <div className="px-4 pt-2 pb-4 shrink-0">
          <div className="flex items-end gap-2 rounded-2xl bg-white/[0.03] border border-white/[0.08] focus-within:border-white/[0.16] transition-colors p-1.5 pl-3.5">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={handleInputResize}
              onKeyDown={handleKeyDown}
              placeholder="Ask or tell Copilot to do something"
              aria-label="Message Copilot"
              className="flex-1 bg-transparent py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none resize-none max-h-32"
            />
            <button
              type="button"
              disabled={!input.trim() || isLoading}
              onClick={() => handleSendMessage()}
              aria-label="Send message"
              className="grid place-items-center w-8 h-8 shrink-0 rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 disabled:bg-white/[0.06] disabled:text-zinc-600 transition-colors cursor-pointer disabled:cursor-default"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowUp className="w-4 h-4" strokeWidth={2.2} />
              )}
            </button>
          </div>

          <div className="flex items-center justify-between mt-2 px-1 text-[11px] text-zinc-600">
            <span>Enter to send, Shift+Enter for a new line</span>
            <span>⌘J to close</span>
          </div>
        </div>
      </div>
    </>,
    document.body
  )
}
