import React, { useId } from 'react'

export function HyirLogo({ className = "w-5 h-5 text-white" }: { className?: string }) {
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

// Backward-compatible alias
export const HyrLogo = HyirLogo

export const HYIR_AI_SHAPE =
  "M125.208 163.343L62.396 233.584H0V112.932C0 85.1715 10.2251 58.3833 28.7226 37.6831C50.1479 13.7066 80.7777 0 112.932 0H125.208V163.343Z"
export const HYIR_AI_STRIPES =
  "M250 215.94C250 225.905 241.905 233.973 231.94 233.94L228.806 233.93L250 210.426V215.94ZM250 191.014L211.353 233.871L201.028 233.837L250 179.53V191.014ZM250 160.118L183.576 233.778L173.251 233.744L250 148.633V160.118ZM250 129.221L155.798 233.687L145.474 233.652L250 117.737V129.221ZM241.762 95.9766C243.94 97.3855 245.795 99.2528 247.189 101.441L128.021 233.594L125.208 233.585V225.229L241.762 95.9766ZM125.208 205.817V194.334L216.495 93.1016H226.851L125.208 205.817ZM198.99 93.1016L125.208 174.922V163.344L187.188 93.1016H198.99Z"

export function HyirAiLogo({
  className = "w-4 h-4",
  gradient = true,
}: {
  className?: string
  gradient?: boolean
}) {
  const id = `hyir-ai-${useId().replace(/[^a-zA-Z0-9]/g, "")}`
  const shapeFill = gradient ? `url(#${id})` : "currentColor"
  const stripeFill = gradient ? "white" : "currentColor"

  return (
    <svg
      viewBox="0 0 250 234"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      {gradient && (
        <defs>
          <linearGradient id={id} x1="62.604" y1="0" x2="62.604" y2="233.584" gradientUnits="userSpaceOnUse">
            <stop stopColor="white" />
            <stop offset="1" stopColor="#65ACFC" />
          </linearGradient>
        </defs>
      )}
      <path
        d={HYIR_AI_SHAPE}
        fill={shapeFill}
      />
      <path
        d={HYIR_AI_STRIPES}
        fill={stripeFill}
      />
    </svg>
  )
}
