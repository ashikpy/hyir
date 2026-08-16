'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Check, Sparkles } from 'lucide-react'
import { createApplication } from '@/app/actions'
import { CompanyLogo } from '@/components/ui/avatars'

const STATUS_OPTIONS = [
  { value: 'APPLIED', label: 'Applied' },
  { value: 'SAVED', label: 'Draft' },
  { value: 'SCREENING', label: 'Screening' },
  { value: 'INTERVIEW', label: 'Interview' },
  { value: 'OFFER', label: 'Offer' },
]

export default function NewApplicationPage() {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)
  const [status, setStatus] = useState('APPLIED')
  const [companyName, setCompanyName] = useState('')
  const [roleTitle, setRoleTitle] = useState('')
  const [applicationUrl, setApplicationUrl] = useState('')
  const formRef = useRef<HTMLFormElement>(null)

  function handleUrlChange(url: string) {
    setApplicationUrl(url)
    if (!companyName && url) {
      try {
        const parsed = new URL(url.startsWith('http') ? url : `https://${url}`)
        const hostname = parsed.hostname.replace(/^www\./, '')
        const parts = hostname.split('.')
        
        let detected = ''
        if (hostname.includes('greenhouse.io') || hostname.includes('lever.co') || hostname.includes('ashbyhq.com') || hostname.includes('workday.com')) {
          const pathParts = parsed.pathname.split('/').filter(Boolean)
          if (pathParts.length > 0) detected = pathParts[0]
        } else if (parts.length >= 2) {
          detected = parts[0]
        }

        if (detected && detected !== 'careers' && detected !== 'jobs' && detected !== 'boards') {
          setCompanyName(detected.charAt(0).toUpperCase() + detected.slice(1).toLowerCase())
        }
      } catch {
        // ignore
      }
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        formRef.current?.requestSubmit()
      }
      if (e.key === 'Escape' && e.target === document.body) {
        router.push('/applications')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [router])

  async function handleSubmit(formData: FormData) {
    if (!companyName.trim() || !roleTitle.trim()) {
      alert('Please provide Company Name and Role Title.')
      return
    }
    setIsPending(true)
    try {
      formData.set('status', status)
      formData.set('companyName', companyName)
      formData.set('roleTitle', roleTitle)
      formData.set('applicationUrl', applicationUrl)
      
      const slug = await createApplication(formData)
      router.push(slug ? `/applications/${slug}` : '/applications')
    } catch (e) {
      console.error(e)
      alert('Failed to save.')
      setIsPending(false)
    }
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="max-w-2xl mx-auto pt-6 pb-24">
      {/* Top Nav */}
      <div className="flex items-center justify-between mb-16">
        <Link 
          href="/applications" 
          className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Applications</span>
        </Link>
        <button 
          onClick={() => formRef.current?.requestSubmit()}
          disabled={isPending}
          className="text-sm font-medium text-white bg-zinc-900 hover:bg-zinc-800 px-4 py-1.5 rounded-full transition-colors disabled:opacity-50"
        >
          {isPending ? 'Saving...' : 'Save Application'}
        </button>
      </div>

      <form ref={formRef} action={handleSubmit} className="space-y-10">
        {/* URL Input */}
        <div className="flex flex-col gap-3">
          <label className="block text-xs uppercase tracking-widest font-semibold text-zinc-500">Job Post / Career Link</label>
          <div className="relative group">
            <input 
              type="url"
              value={applicationUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="Paste job link (optional)"
              className="w-full bg-zinc-900/50 border border-zinc-800/80 rounded-xl py-3 pl-4 pr-12 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 focus:bg-zinc-900 transition-colors font-mono"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-3">
              {!applicationUrl && <Sparkles className="w-3.5 h-3.5 text-zinc-600" />}
              {applicationUrl && <CompanyLogo name={companyName || 'X'} url={applicationUrl} className="w-5 h-5 rounded flex-shrink-0" />}
            </div>
          </div>
        </div>

        {/* Title Area */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="flex flex-col gap-3">
            <label className="block text-xs uppercase tracking-widest font-semibold text-zinc-500">Company Name *</label>
            <input 
              autoFocus
              name="companyName"
              required
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Linear" 
              className="w-full bg-zinc-900/50 border border-zinc-800/80 rounded-xl py-3 px-4 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 focus:bg-zinc-900 transition-colors font-medium"
            />
          </div>
          <div className="flex flex-col gap-3">
            <label className="block text-xs uppercase tracking-widest font-semibold text-zinc-500">Role Title *</label>
            <input 
              name="roleTitle"
              required
              type="text"
              value={roleTitle}
              onChange={(e) => setRoleTitle(e.target.value)}
              placeholder="e.g. Senior Product Designer" 
              className="w-full bg-zinc-900/50 border border-zinc-800/80 rounded-xl py-3 px-4 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 focus:bg-zinc-900 transition-colors font-medium"
            />
          </div>
        </div>

        {/* Status Pills */}
        <div className="flex flex-col gap-4 pt-2">
          <label className="block text-xs uppercase tracking-widest font-semibold text-zinc-500">Current Status</label>
          <div className="flex flex-wrap gap-3">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setStatus(opt.value)}
                className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs font-semibold transition-colors border ${
                  status === opt.value 
                    ? 'bg-zinc-200 text-black border-zinc-200' 
                    : 'bg-zinc-900/50 text-zinc-400 border-zinc-800/80 hover:border-zinc-700 hover:text-zinc-300'
                }`}
              >
                {status === opt.value && <Check className="w-3.5 h-3.5" />}
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <hr className="border-zinc-900/50" />

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
          <div className="flex flex-col gap-3">
            <label className="block text-xs uppercase tracking-widest font-semibold text-zinc-500">Date Applied</label>
            <input 
              name="dateApplied"
              type="date"
              defaultValue={today}
              className="w-full bg-zinc-900/50 border border-zinc-800/80 rounded-xl py-3 px-4 text-sm text-zinc-300 focus:outline-none focus:border-zinc-600 focus:bg-zinc-900 transition-colors"
            />
          </div>

          <div className="flex flex-col gap-3">
            <label className="block text-xs uppercase tracking-widest font-semibold text-zinc-500">Location</label>
            <input 
              name="location"
              type="text" 
              placeholder="e.g. Remote (US)"
              className="w-full bg-zinc-900/50 border border-zinc-800/80 rounded-xl py-3 px-4 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 focus:bg-zinc-900 transition-colors"
            />
          </div>

          <div className="flex flex-col gap-3">
            <label className="block text-xs uppercase tracking-widest font-semibold text-zinc-500">Target Salary</label>
            <input 
              name="salary"
              type="text" 
              placeholder="e.g. $160k - $190k"
              className="w-full bg-zinc-900/50 border border-zinc-800/80 rounded-xl py-3 px-4 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 focus:bg-zinc-900 transition-colors"
            />
          </div>

          <div className="flex flex-col gap-3">
            <label className="block text-xs uppercase tracking-widest font-semibold text-zinc-500">Contact Name</label>
            <input 
              name="contactName"
              type="text" 
              placeholder="e.g. Alex Morgan"
              className="w-full bg-zinc-900/50 border border-zinc-800/80 rounded-xl py-3 px-4 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 focus:bg-zinc-900 transition-colors"
            />
          </div>
        </div>

        {/* Notes */}
        <div className="flex flex-col gap-3 pt-4">
          <label className="block text-xs uppercase tracking-widest font-semibold text-zinc-500">Notes & Strategy</label>
          <textarea 
            name="notes"
            rows={5}
            placeholder="Write down key talking points, interviewers, or thoughts..."
            className="w-full bg-zinc-900/50 border border-zinc-800/80 rounded-xl py-3 px-4 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 focus:bg-zinc-900 transition-colors resize-none leading-relaxed"
          />
        </div>
        
        {/* Hidden keyboard hint */}
        <div className="text-center pt-8">
          <span className="text-[10px] text-zinc-700 font-mono tracking-widest uppercase">
            Press <kbd className="px-1.5 py-0.5 rounded border border-zinc-800 bg-zinc-900 mx-1">⌘ + ↵</kbd> to save
          </span>
        </div>
      </form>
    </div>
  )
}
