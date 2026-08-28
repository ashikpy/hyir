'use client'

import { useState, useRef, useEffect } from 'react'
import { Save, X, Building2, Briefcase, Link as LinkIcon, DollarSign, Calendar, MapPin, User, FileText, CheckCircle2 } from 'lucide-react'
import { updateApplication } from '@/app/actions'
import { Application } from '@prisma/client'
import { useRouter } from 'next/navigation'
import { LocationInput } from '@/components/ui/location-input'
import { RoleInput } from '@/components/ui/role-input'

export function EditApplicationModal({ 
  application, 
  onClose 
}: { 
  application: Application, 
  onClose: () => void 
}) {
  const [isPending, setIsPending] = useState(false)
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  async function action(formData: FormData) {
    setIsPending(true)
    try {
      const newSlug = await updateApplication(application.id, formData)
      onClose()
      if (newSlug !== application.slug) {
        router.push(`/applications/${newSlug}`)
      }
    } catch (e) {
      console.error(e)
      alert("Failed to update application")
      setIsPending(false)
    }
  }

  const dateAppliedString = application.dateApplied 
    ? new Date(application.dateApplied).toISOString().split('T')[0]
    : ''

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-xs animate-fade-in transition-opacity"
        onClick={onClose}
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
          <div>
            <h2 className="text-sm font-semibold text-zinc-100 tracking-tight">Edit Application</h2>
            <p className="text-xs text-zinc-500">Update details for {application.companyName}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-zinc-500 font-mono tracking-wider bg-zinc-900 border border-zinc-800/80 px-2 py-0.5 rounded">ESC</span>
            <button 
              type="button" 
              onClick={onClose}
              className="text-zinc-400 hover:text-zinc-100 p-1 rounded-md hover:bg-zinc-900 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Drawer Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Core Info */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-zinc-500" /> Company Name <span className="text-red-400">*</span>
              </label>
              <input 
                name="companyName"
                required
                defaultValue={application.companyName}
                type="text" 
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
                defaultValue={application.roleTitle}
                placeholder="e.g. Product Designer, Founding Designer..."
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg py-2.5 px-3 pl-8 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">Status</label>
                <select name="status" defaultValue={application.status} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg py-2.5 px-3 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500 transition-all cursor-pointer">
                  <option value="APPLIED">Applied</option>
                  <option value="CONTACTED">Contacted</option>
                  <option value="INTERVIEW">Interview</option>
                  <option value="OFFER">Offer</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="GHOSTED">Ghosted</option>
                  <option value="SAVED">Draft</option>
                  <option value="ACCEPTED">Accepted</option>
                  <option value="WITHDRAWN">Withdrawn</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-zinc-500" /> Date Applied
                </label>
                <input 
                  name="dateApplied"
                  type="date" 
                  defaultValue={dateAppliedString}
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg py-2.5 px-3 text-sm text-zinc-300 focus:outline-none focus:border-zinc-500 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Details & Compensation */}
          <div className="pt-4 border-t border-zinc-900 space-y-4">
            <h3 className="text-xs font-semibold text-zinc-400">Details & Links</h3>
            
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5 text-zinc-500" /> Application URL
              </label>
              <input 
                name="applicationUrl"
                type="url" 
                defaultValue={application.applicationUrl || ''}
                placeholder="https://..."
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg py-2.5 px-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-zinc-500" /> Target Salary
                </label>
                <input 
                  name="salary"
                  type="text" 
                  defaultValue={application.salary || ''}
                  placeholder="e.g. $150k - $180k"
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg py-2.5 px-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-zinc-500" /> Location
                </label>
                <LocationInput 
                  name="location"
                  defaultValue={application.location || ''}
                  placeholder="Remote / SF / Bangalore"
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg py-2.5 px-3 pl-8 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="pt-4 border-t border-zinc-900 space-y-4">
            <h3 className="text-xs font-semibold text-zinc-400">Recruiter / Contact</h3>
            <div className="grid grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400">Name</label>
                <input 
                  name="contactName"
                  type="text" 
                  defaultValue={application.contactName || ''}
                  placeholder="Contact Name"
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg py-2.5 px-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400">Role</label>
                <input 
                  name="contactRole"
                  type="text" 
                  defaultValue={application.contactRole || ''}
                  placeholder="Recruiter / Hiring Mgr"
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg py-2.5 px-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400">Email</label>
                <input 
                  name="contactEmail"
                  type="email" 
                  defaultValue={application.contactEmail || ''}
                  placeholder="email@company.com"
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg py-2.5 px-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400">Profile / LinkedIn URL</label>
                <input 
                  name="contactUrl"
                  type="url" 
                  defaultValue={application.contactUrl || ''}
                  placeholder="https://linkedin.com/in/..."
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg py-2.5 px-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="pt-4 border-t border-zinc-900 space-y-2">
            <label className="text-xs uppercase tracking-wider font-semibold text-zinc-400 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-zinc-500" /> Notes
            </label>
            <textarea 
              name="notes"
              rows={4}
              defaultValue={application.notes || ''}
              placeholder="Application notes, interview thoughts, prep items..."
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all resize-none"
            />
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="p-5 border-t border-zinc-900 bg-zinc-950/90 backdrop-blur-md flex items-center justify-between shrink-0">
          <button 
            type="button"
            onClick={onClose}
            className="text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors px-3 py-2"
          >
            Cancel
          </button>
          <button 
            type="submit"
            disabled={isPending}
            className="flex items-center gap-2 bg-white hover:bg-zinc-200 text-black px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-lg shadow-white/5 active:scale-[0.98] disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> {isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
