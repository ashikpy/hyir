import React from 'react'

export function HyrLogo({ className = "w-5 h-5 text-white" }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 302 283" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path 
        d="M151 0.5V197L75.5 281.5H0.5V84.5L75.5 0.5H151Z" 
        fill="currentColor"
      />
      <path 
        d="M225.5 112.5L151.5 197.229V282H301V112.5H225.5Z" 
        fill="currentColor"
      />
    </svg>
  )
}
