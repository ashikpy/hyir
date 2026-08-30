'use client'

import { useState } from 'react'

const GENERIC_JOB_HOSTS = [
  'wellfound.com',
  'angel.co',
  'linkedin.com',
  'greenhouse.io',
  'lever.co',
  'ashbyhq.com',
  'workday.com',
  'smartrecruiters.com',
  'bamboohr.com',
  'recruitee.com',
]

export function CompanyLogo({
  name,
  url,
  className = "w-6 h-6"
}: {
  name: string
  url?: string | null
  className?: string
}) {
  const [hasError, setHasError] = useState(false)
  let domain = null

  if (url) {
    try {
      const parsed = new URL(url.startsWith('http') ? url : `https://${url}`)
      const hostname = parsed.hostname.replace(/^www\./, '').toLowerCase()
      // Only extract domain if it's not a generic job portal
      if (!GENERIC_JOB_HOSTS.some(host => hostname.includes(host))) {
        domain = hostname
      }
    } catch {
      // Invalid URL
    }
  }

  // Fallback to name domain inference (e.g. "Havi.co" -> "havi.co", "Project44" -> "project44.com")
  if (!domain && name) {
    const trimmed = name.trim().toLowerCase()
    if (trimmed.includes('.')) {
      domain = trimmed
    } else {
      domain = `${trimmed.replace(/[^a-z0-9]/g, '')}.com`
    }
  }

  const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=27272a&color=fafafa&format=svg`

  if (!domain || hasError) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={fallbackUrl}
        alt={`${name} logo`}
        className={`${className} rounded-md object-cover border border-zinc-800 shrink-0`}
      />
    )
  }

  // Use unavatar with fallback=false so it returns 404 when no favicon exists, triggering onError to ui-avatars
  const logoUrl = `https://unavatar.io/${domain}?fallback=false`

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logoUrl}
      alt={`${name} logo`}
      className={`${className} rounded-md object-contain p-1 border border-zinc-800 bg-white shrink-0 [filter:drop-shadow(0_0_1px_rgba(0,0,0,0.3))]`}
      onError={() => setHasError(true)}
    />
  )
}

export function ContactAvatar({
  name,
  className = "w-8 h-8"
}: {
  name: string
  className?: string
}) {
  const url = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=3f3f46&color=fafafa&rounded=true&format=svg`

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={name}
      className={`${className} rounded-full object-cover border border-zinc-700 shrink-0`}
    />
  )
}
