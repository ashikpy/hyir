'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { Briefcase, X } from 'lucide-react'

const CURATED_ROLES = [
  // Product & Design
  'Product Designer',
  'Senior Product Designer',
  'Lead Product Designer',
  'Staff Product Designer',
  'Principal Product Designer',
  'Founding Designer',
  'UI/UX Designer',
  'UX Designer',
  'Design Systems Designer',
  'Interaction Designer',
  'Visual Designer',
  'Product Design Intern',
  'Head of Design',
  'Design Director',
  'UX Researcher',
  'Brand Designer',

  // Product Management
  'Product Manager',
  'Associate Product Manager',
  'Senior Product Manager',
  'Lead Product Manager',
  'Group Product Manager',
  'Technical Product Manager',

  // Engineering
  'Frontend Engineer',
  'Senior Frontend Engineer',
  'Full Stack Engineer',
  'Senior Full Stack Engineer',
  'Software Engineer',
  'Senior Software Engineer',
  'UI Engineer',
  'Mobile Engineer (iOS/Android)',
]

export function RoleInput({
  name = 'roleTitle',
  defaultValue = '',
  placeholder = 'e.g. Product Designer, Founding Designer...',
  className = '',
  required = false,
  onChange,
}: {
  name?: string
  defaultValue?: string
  placeholder?: string
  className?: string
  required?: boolean
  onChange?: (val: string) => void
}) {
  const [value, setValue] = useState(defaultValue)
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setValue(defaultValue)
  }, [defaultValue])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredSuggestions = useMemo(() => {
    if (!value || value.trim().length === 0) {
      return CURATED_ROLES.slice(0, 10)
    }
    const q = value.toLowerCase().trim()
    const matches = CURATED_ROLES.filter((r) => r.toLowerCase().includes(q))
    return matches.length > 0 ? matches.slice(0, 8) : []
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setValue(val)
    setIsOpen(true)
    setSelectedIndex(-1)
    if (onChange) onChange(val)
  }

  const handleSelect = (role: string) => {
    setValue(role)
    setIsOpen(false)
    setSelectedIndex(-1)
    if (onChange) onChange(role)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || filteredSuggestions.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev + 1 < filteredSuggestions.length ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : filteredSuggestions.length - 1))
    } else if (e.key === 'Enter') {
      if (selectedIndex >= 0 && selectedIndex < filteredSuggestions.length) {
        e.preventDefault()
        handleSelect(filteredSuggestions[selectedIndex])
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
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          required={required}
          autoComplete="off"
          className={
            className ||
            'w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 px-3 pl-8 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500'
          }
        />
        <Briefcase className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />

        {value && (
          <button
            type="button"
            onClick={() => {
              setValue('')
              if (onChange) onChange('')
              inputRef.current?.focus()
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-0.5"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {isOpen && filteredSuggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-[#0c0c0e] border border-zinc-800 rounded-xl shadow-2xl z-50 overflow-hidden py-1 max-h-56 overflow-y-auto">
          {filteredSuggestions.map((role, idx) => {
            const isSelected = idx === selectedIndex
            return (
              <div
                key={role}
                onMouseDown={(e) => {
                  e.preventDefault()
                  handleSelect(role)
                }}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`px-3.5 py-2 text-xs flex items-center gap-2.5 cursor-pointer transition-colors ${
                  isSelected ? 'bg-zinc-800 text-white' : 'text-zinc-300 hover:bg-zinc-900'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                <span className="truncate">{role}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
