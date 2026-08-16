'use client'

import Link from 'next/link'

export function AddApplicationButton({ className, children }: { className?: string, children: React.ReactNode }) {
  return (
    <Link 
      href="/applications/new"
      className={className}
    >
      {children}
    </Link>
  )
}
