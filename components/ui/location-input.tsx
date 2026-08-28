'use client'

import { useState, useEffect, useRef } from 'react'
import { MapPin, X, Loader2 } from 'lucide-react'

const DEFAULT_SUGGESTIONS = [
  'Remote',
  'Remote (Worldwide)',
  'Remote (US)',
  'Remote (India)',
  'Bangalore, Karnataka, India',
  'San Francisco, California, United States',
  'New York, New York, United States',
  'London, United Kingdom',
  'Berlin, Germany',
  'Singapore',
]

export function LocationInput({
  name = 'location',
  defaultValue = '',
  placeholder = 'e.g. Remote, Bangalore, San Francisco...',
  className = '',
  required = false,
}: {
  name?: string
  defaultValue?: string
  placeholder?: string
  className?: string
  required?: boolean
}) {
  const [value, setValue] = useState(defaultValue)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceTimer = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    setValue(defaultValue)
  }, [defaultValue])

  // Handle outside click to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchLocations = async (query: string) => {
    if (!query.trim() || query.trim().length < 2) {
      setSuggestions(DEFAULT_SUGGESTIONS)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      // Free OpenStreetMap Photon API
      const res = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(query.trim())}&limit=6`
      )
      if (!res.ok) throw new Error('API error')
      const data = await res.json()

      const formatted: string[] = []

      // If user typed "remote", add remote suggestions
      if ('remote'.includes(query.toLowerCase())) {
        DEFAULT_SUGGESTIONS.filter((s) => s.toLowerCase().includes('remote')).forEach((s) =>
          formatted.push(s)
        )
      }

      if (data.features && Array.isArray(data.features)) {
        data.features.forEach((f: any) => {
          const p = f.properties
          const parts: string[] = []
          if (p.name) parts.push(p.name)
          if (p.city && p.city !== p.name && !parts.includes(p.city)) parts.push(p.city)
          if (p.state && p.state !== p.name && !parts.includes(p.state)) parts.push(p.state)
          if (p.country && !parts.includes(p.country)) parts.push(p.country)

          const loc = parts.join(', ')
          if (loc && !formatted.includes(loc)) {
            formatted.push(loc)
          }
        })
      }

      setSuggestions(formatted.length > 0 ? formatted : DEFAULT_SUGGESTIONS)
    } catch {
      // Fallback to client suggestions
      const q = query.toLowerCase()
      const fallback = DEFAULT_SUGGESTIONS.filter((s) => s.toLowerCase().includes(q))
      setSuggestions(fallback.length > 0 ? fallback : DEFAULT_SUGGESTIONS)
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setValue(val)
    setIsOpen(true)
    setSelectedIndex(-1)

    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      fetchLocations(val)
    }, 200)
  }

  const handleFocus = () => {
    setIsOpen(true)
    if (!value || value.length < 2) {
      setSuggestions(DEFAULT_SUGGESTIONS)
    } else {
      fetchLocations(value)
    }
  }

  const handleSelect = (loc: string) => {
    setValue(loc)
    setIsOpen(false)
    setSelectedIndex(-1)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev + 1 < suggestions.length ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : suggestions.length - 1))
    } else if (e.key === 'Enter') {
      if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
        e.preventDefault()
        handleSelect(suggestions[selectedIndex])
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          name={name}
          value={value}
          onChange={handleChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          required={required}
          autoComplete="off"
          className={
            className ||
            'w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 px-3 pl-8 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500'
          }
        />
        <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />

        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
          {isLoading && <Loader2 className="w-3.5 h-3.5 text-zinc-500 animate-spin" />}
          {value && (
            <button
              type="button"
              onClick={() => {
                setValue('')
                inputRef.current?.focus()
              }}
              className="text-zinc-500 hover:text-zinc-300 p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {isOpen && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-[#0c0c0e] border border-zinc-800 rounded-xl shadow-2xl z-50 overflow-hidden py-1 max-h-56 overflow-y-auto">
          {suggestions.map((loc, idx) => {
            const isSelected = idx === selectedIndex
            return (
              <div
                key={loc}
                onMouseDown={(e) => {
                  e.preventDefault()
                  handleSelect(loc)
                }}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`px-3.5 py-2 text-xs flex items-center gap-2.5 cursor-pointer transition-colors ${
                  isSelected ? 'bg-zinc-800 text-white' : 'text-zinc-300 hover:bg-zinc-900'
                }`}
              >
                <MapPin className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                <span className="truncate">{loc}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
