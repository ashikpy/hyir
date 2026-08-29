'use client'

import { useState, useRef, useEffect } from 'react'
import { Save, X, Building2, Briefcase, Link as LinkIcon, DollarSign, Calendar, MapPin, User, FileText, Check, FileCode2 } from 'lucide-react'
import { updateApplication } from '@/app/actions'
import { Application, ApplicationStatus } from '@prisma/client'
import { useRouter } from 'next/navigation'
import { LocationInput } from '@/components/ui/location-input'
import { RoleInput } from '@/components/ui/role-input'

function InternshipIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg
      stroke="currentColor"
      fill="currentColor"
      strokeWidth="0"
      viewBox="0 0 256 256"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M226.53,56.41l-96-32a8,8,0,0,0-5.06,0l-96,32A8,8,0,0,0,24,64v80a8,8,0,0,0,16,0V75.1L73.59,86.29a64,64,0,0,0,20.65,88.05c-18,7.06-33.56,19.83-44.94,37.29a8,8,0,1,0,13.4,8.74C77.77,197.25,101.57,184,128,184s50.23,13.25,65.3,36.37a8,8,0,0,0,13.4-8.74c-11.38-17.46-27-30.23-44.94-37.29a64,64,0,0,0,20.65-88l44.12-14.7a8,8,0,0,0,0-15.18ZM176,120A48,48,0,1,1,89.35,91.55l36.12,12a8,8,0,0,0,5.06,0l36.12-12A47.89,47.89,0,0,1,176,120Z" />
    </svg>
  )
}

const STATUS_OPTIONS = [
  {
    value: 'APPLIED',
    label: 'Applied',
    activeClass: 'bg-blue-500/15 text-blue-300 border-blue-500/60 ring-1 ring-blue-500/30',
    idleClass: 'bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:border-blue-500/40 hover:text-blue-300',
    dotColor: 'bg-blue-400',
    checkColor: 'text-blue-400',
  },
  {
    value: 'CONTACTED',
    label: 'Contacted',
    activeClass: 'bg-purple-500/15 text-purple-300 border-purple-500/60 ring-1 ring-purple-500/30',
    idleClass: 'bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:border-purple-500/40 hover:text-purple-300',
    dotColor: 'bg-purple-400',
    checkColor: 'text-purple-400',
  },
  {
    value: 'INTERVIEW',
    label: 'Interview',
    activeClass: 'bg-orange-500/15 text-orange-300 border-orange-500/60 ring-1 ring-orange-500/30',
    idleClass: 'bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:border-orange-500/40 hover:text-orange-300',
    dotColor: 'bg-orange-400',
    checkColor: 'text-orange-400',
  },
  {
    value: 'OFFER',
    label: 'Offer',
    activeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/60 ring-1 ring-emerald-500/30',
    idleClass: 'bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:border-emerald-500/40 hover:text-emerald-300',
    dotColor: 'bg-emerald-400',
    checkColor: 'text-emerald-400',
  },
  {
    value: 'REJECTED',
    label: 'Rejected',
    activeClass: 'bg-rose-500/15 text-rose-300 border-rose-500/60 ring-1 ring-rose-500/30',
    idleClass: 'bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:border-rose-500/40 hover:text-rose-300',
    dotColor: 'bg-rose-400',
    checkColor: 'text-rose-400',
  },
  {
    value: 'GHOSTED',
    label: 'Ghosted',
    activeClass: 'bg-zinc-800 text-zinc-200 border-zinc-600 ring-1 ring-zinc-500/30',
    idleClass: 'bg-zinc-900/60 text-zinc-500 border-zinc-800 hover:border-zinc-700 hover:text-zinc-300',
    dotColor: 'bg-zinc-500',
    checkColor: 'text-zinc-400',
  },
]

const JOB_TYPE_OPTIONS = [
  { value: 'FULL_TIME', label: 'Full Time', icon: Briefcase },
  { value: 'INTERNSHIP', label: 'Internship', isInternship: true },
  { value: 'CONTRACT', label: 'Contract', icon: FileCode2 },
]

export function EditApplicationModal({ 
  application, 
  onClose 
}: { 
  application: Application, 
  onClose: () => void 
}) {
  const [isPending, setIsPending] = useState(false)
  const [status, setStatus] = useState<ApplicationStatus>(application.status)
  const [salary, setSalary] = useState(application.salary || '')
  const [contactName, setContactName] = useState(application.contactName || '')
  const [jobType, setJobType] = useState<string>(
    ['FULL_TIME', 'INTERNSHIP', 'CONTRACT'].includes(application.jobType)
      ? application.jobType
      : 'FULL_TIME'
  )
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
        {/* Hidden Form Bindings */}
        <input type="hidden" name="status" value={status} />
        <input type="hidden" name="jobType" value={jobType} />
        <input type="hidden" name="workplaceType" value={application.workplaceType || 'REMOTE'} />

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
              className="text-zinc-400 hover:text-zinc-100 p-1 rounded-md hover:bg-zinc-900 transition-colors cursor-pointer"
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

            {/* Status Button Group */}
            <div className="space-y-2 pt-1">
              <label className="text-xs font-medium text-zinc-300 block">Status</label>
              <div className="grid grid-cols-3 gap-2">
                {STATUS_OPTIONS.map((opt) => {
                  const isSelected = status === opt.value
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setStatus(opt.value as ApplicationStatus)}
                      className={`flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-all border cursor-pointer ${
                        isSelected ? opt.activeClass : opt.idleClass
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${opt.dotColor} ${
                            isSelected ? 'scale-110' : 'opacity-60'
                          }`}
                        />
                        <span className="truncate">{opt.label}</span>
                      </div>
                      {isSelected && <Check className={`w-3 h-3 shrink-0 ml-1 ${opt.checkColor}`} />}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Job Type (3 Options) */}
            <div className="space-y-2 pt-1">
              <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-zinc-500" /> Job Type
              </label>
              <div className="grid grid-cols-3 gap-2">
                {JOB_TYPE_OPTIONS.map((opt) => {
                  const isSelected = jobType === opt.value
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setJobType(opt.value)}
                      className={`inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-medium text-center transition-all border cursor-pointer ${
                        isSelected
                          ? 'bg-zinc-100 text-black border-white font-semibold shadow-xs'
                          : 'bg-zinc-900/50 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-zinc-200'
                      }`}
                    >
                      {opt.isInternship ? (
                        <InternshipIcon className={`w-3.5 h-3.5 ${isSelected ? 'text-black' : 'text-zinc-400'}`} />
                      ) : (
                        opt.icon && <opt.icon className={`w-3.5 h-3.5 ${isSelected ? 'text-black' : 'text-zinc-400'}`} />
                      )}
                      <span>{opt.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Date Applied */}
            <div className="space-y-1.5 pt-1">
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
                  placeholder="e.g. $150k - $180k or Not Disclosed"
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
                  placeholder="e.g. Lead Recruiter"
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg py-2.5 px-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
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
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg py-2.5 px-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="px-6 py-4 border-t border-zinc-900 bg-zinc-950 flex items-center justify-between gap-3 shrink-0">
          <button 
            type="button" 
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          
          <button 
            type="submit" 
            disabled={isPending}
            className="inline-flex items-center gap-2 bg-white text-black hover:bg-zinc-200 font-medium px-4 py-2 rounded-lg text-xs transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isPending ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </form>
    </div>
  )
}
