'use client'

import { useEffect, useState, useRef } from 'react'
import { Plus, X, Sparkles, Building2, Briefcase, Link as LinkIcon, DollarSign, Calendar, MapPin, User, FileText } from 'lucide-react'
import { createApplication } from '@/app/actions'
import { LocationInput } from '@/components/ui/location-input'
import { RoleInput } from '@/components/ui/role-input'

export function QuickAddModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const [salary, setSalary] = useState('')
  const [contactName, setContactName] = useState('')
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      // Toggle on N key
      if (e.key.toLowerCase() === 'n' && !e.metaKey && !e.ctrlKey && e.target === document.body) {
        e.preventDefault()
        setIsOpen((open) => !open)
      }
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }

    const openModal = () => setIsOpen(true)

    document.addEventListener('keydown', down)
    window.addEventListener('open-quick-add', openModal)
    return () => {
      document.removeEventListener('keydown', down)
      window.removeEventListener('open-quick-add', openModal)
    }
  }, [])

  if (!isOpen) return null

  async function action(formData: FormData) {
    setIsPending(true)
    try {
      await createApplication(formData)
      setIsOpen(false)
      setSalary('')
      setContactName('')
      formRef.current?.reset()
    } catch (e) {
      console.error(e)
      alert("Failed to save application")
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-xs animate-fade-in transition-opacity"
        onClick={() => setIsOpen(false)}
      />

      {/* Slide-over Drawer */}
      <form 
        ref={formRef}
        action={action}
        className="relative z-10 w-full max-w-lg bg-zinc-950 border-l border-zinc-800 shadow-2xl flex flex-col h-full animate-slide-in-right"
        onClick={e => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="px-6 py-5 border-b border-zinc-900 bg-zinc-950 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-100 tracking-tight">New Application</h2>
              <p className="text-xs text-zinc-500">Track a new job opportunity</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-zinc-500 font-mono tracking-wider bg-zinc-900 border border-zinc-800/80 px-2 py-0.5 rounded">ESC</span>
            <button 
              type="button" 
              onClick={() => setIsOpen(false)}
              className="text-zinc-400 hover:text-zinc-100 p-1 rounded-md hover:bg-zinc-900 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Drawer Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Primary Details */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-zinc-500" /> Company Name <span className="text-red-400">*</span>
              </label>
              <input 
                autoFocus
                name="companyName"
                required
                type="text" 
                placeholder="e.g. Stripe, Linear, Vercel" 
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg py-2.5 px-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition-all"
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-zinc-500" /> Role Title <span className="text-red-400">*</span>
              </label>
              <RoleInput 
                name="roleTitle"
                required
                placeholder="e.g. Product Designer, Founding Designer..." 
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg py-2.5 px-3 pl-8 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">Status</label>
                <select name="status" className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg py-2.5 px-3 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500 transition-all cursor-pointer">
                  <option value="APPLIED">Applied</option>
                  <option value="CONTACTED">Contacted</option>
                  <option value="INTERVIEW">Interview</option>
                  <option value="OFFER">Offer</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="GHOSTED">Ghosted</option>
                  <option value="SAVED">Draft</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-zinc-500" /> Date Applied
                </label>
                <input 
                  name="dateApplied"
                  type="date" 
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg py-2.5 px-3 text-sm text-zinc-300 focus:outline-none focus:border-zinc-500 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Links & Compensation */}
          <div className="pt-4 border-t border-zinc-900 space-y-4">
            <h3 className="text-xs font-semibold text-zinc-400">Details & Links</h3>
            
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5 text-zinc-500" /> Job Post URL
              </label>
              <input 
                name="applicationUrl"
                type="url" 
                placeholder="https://company.com/careers/job-id" 
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg py-2.5 px-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-zinc-500" /> Target Salary
                  </label>
                  <button
                    type="button"
                    onClick={() => setSalary(salary === 'Not Disclosed' ? '' : 'Not Disclosed')}
                    className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                      salary === 'Not Disclosed'
                        ? 'bg-zinc-800 text-zinc-200 border-zinc-600'
                        : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:border-zinc-700'
                    }`}
                  >
                    {salary === 'Not Disclosed' ? '✓ Not Disclosed' : 'Not Disclosed'}
                  </button>
                </div>
                <input 
                  name="salary"
                  type="text" 
                  value={salary}
                  onChange={(e) => setSalary(e.target.value)}
                  placeholder="e.g. $140k - $170k or Not Disclosed" 
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg py-2.5 px-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-zinc-500" /> Location
                </label>
                <LocationInput 
                  name="location"
                  placeholder="Remote / SF / Bangalore" 
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg py-2.5 px-3 pl-8 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Recruiter / Contact */}
          <div className="pt-4 border-t border-zinc-900 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-zinc-400">Recruiter / Contact</h3>
              <button
                type="button"
                onClick={() => setContactName(contactName === 'No Direct Contact' ? '' : 'No Direct Contact')}
                className={`text-[10px] px-2 py-0.5 rounded-md border transition-colors cursor-pointer ${
                  contactName === 'No Direct Contact'
                    ? 'bg-zinc-800 text-zinc-200 border-zinc-600'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:border-zinc-700'
                }`}
              >
                {contactName === 'No Direct Contact' ? '✓ No Direct Contact' : 'No Direct Contact'}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400">Name</label>
                <input 
                  name="contactName"
                  type="text" 
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Sarah Jenkins" 
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg py-2.5 px-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400">Email or LinkedIn</label>
                <input 
                  name="contactEmail"
                  type="text" 
                  placeholder="sarah@company.com" 
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg py-2.5 px-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="pt-4 border-t border-zinc-900 space-y-2">
            <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-zinc-500" /> Initial Notes
            </label>
            <textarea 
              name="notes"
              rows={3}
              placeholder="Referral info, specific team notes, or key portfolio items mentioned..."
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all resize-none"
            />
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="p-5 border-t border-zinc-900 bg-zinc-950/90 backdrop-blur-md flex items-center justify-between shrink-0">
          <button 
            type="button"
            onClick={() => setIsOpen(false)}
            className="text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors px-3 py-2"
          >
            Cancel
          </button>
          <button 
            type="submit"
            disabled={isPending}
            className="flex items-center gap-2 bg-white hover:bg-zinc-200 text-black px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-lg shadow-white/5 active:scale-[0.98] disabled:opacity-50"
          >
            <Plus className="w-4 h-4" /> {isPending ? 'Creating...' : 'Create Application'}
          </button>
        </div>
      </form>
    </div>
  )
}
