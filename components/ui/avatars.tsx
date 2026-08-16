'use client'

import Image from 'next/image'

export function CompanyLogo({ name, url, className = "w-6 h-6" }: { name: string, url?: string | null, className?: string }) {
  // Try to extract domain if URL exists
  let domain = null
  if (url) {
    try {
      domain = new URL(url).hostname
    } catch (e) {
      // Invalid URL
    }
  }

  // If no valid domain, fallback to initials using UI Avatars
  if (!domain) {
    const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=27272a&color=fafafa&format=svg`
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={fallbackUrl} alt={`${name} logo`} className={`${className} rounded-md object-cover border border-zinc-800`} />
    )
  }

  // Use Google Favicon API for high-res favicons (sz=128 gets a decent size)
  const logoUrl = `https://s2.googleusercontent.com/s2/favicons?domain=${domain}&sz=128`

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img 
      src={logoUrl} 
      alt={`${name} logo`} 
      className={`${className} rounded-md object-cover border border-zinc-800 bg-white`}
      onError={(e) => {
        // Fallback to UI avatars if Google fails to find it
        e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=27272a&color=fafafa&format=svg`
      }}
    />
  )
}

export function ContactAvatar({ name, className = "w-8 h-8" }: { name: string, className?: string }) {
  const url = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=3f3f46&color=fafafa&rounded=true&format=svg`
  
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={name} className={`${className} rounded-full object-cover border border-zinc-700`} />
  )
}
