'use client'

import { useEffect, useRef, useState } from 'react'

export const DIAL_CODES = [
  { code: '+32',  iso: 'be', country: 'BE' },
  { code: '+31',  iso: 'nl', country: 'NL' },
  { code: '+352', iso: 'lu', country: 'LU' },
  { code: '+33',  iso: 'fr', country: 'FR' },
  { code: '+49',  iso: 'de', country: 'DE' },
  { code: '+1',   iso: 'us', country: 'US' },
]

// Parse a stored E.164 phone back into { dialCode, local }.
// Checks longer codes first to avoid "+3" matching "+352".
export function parsePhone(full: string): { dialCode: string; local: string } {
  const sorted = [...DIAL_CODES].sort((a, b) => b.code.length - a.code.length)
  for (const { code } of sorted) {
    if (full.startsWith(code)) return { dialCode: code, local: full.slice(code.length) }
  }
  return { dialCode: '+32', local: full }
}

// Build E.164: strip leading zero from local part (0476 → +32476)
export function buildPhone(dialCode: string, local: string): string {
  const stripped = local.replace(/[\s\-\.\(\)]/g, '').replace(/^0+/, '')
  return `${dialCode}${stripped}`
}

export function isValidPhone(full: string): boolean {
  return /^\+[0-9]{9,15}$/.test(full.replace(/[\s\-\.\(\)]/g, ''))
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PhoneInput({
  value,
  onChange,
  placeholder = '476 00 00 00',
  error,
  className,
}: {
  value: string
  onChange: (full: string) => void
  placeholder?: string
  error?: string | null
  className?: string
}) {
  const parsed = parsePhone(value)
  const [dialCode, setDialCode] = useState(parsed.dialCode)
  const [local,    setLocal]    = useState(parsed.local)
  const [open,     setOpen]     = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const currentDial = DIAL_CODES.find((d) => d.code === dialCode) ?? DIAL_CODES[0]

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  function handleDialSelect(code: string) {
    setDialCode(code)
    setOpen(false)
    onChange(buildPhone(code, local))
  }

  function handleLocalChange(raw: string) {
    setLocal(raw)
    onChange(buildPhone(dialCode, raw))
  }

  const borderColor = error ? 'border-red-700' : 'border-kob-border'
  const focusBorder = error ? 'focus-within:border-red-500' : 'focus-within:border-kob-red'

  return (
    <div className={className}>
      <div className={`flex items-stretch rounded border ${borderColor} ${focusBorder} bg-kob-black overflow-visible transition-colors relative`}>

        {/* Country code picker */}
        <div ref={dropdownRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-2 h-full pl-3 pr-2 py-2 bg-kob-surface focus:outline-none cursor-pointer select-none"
            aria-haspopup="listbox"
            aria-expanded={open}
          >
            <span className={`fi fi-${currentDial.iso} rounded-sm`} style={{ fontSize: '1.1rem', lineHeight: 1 }} />
            <span className="text-sm tabular-nums text-kob-white">{currentDial.code}</span>
            <span className="text-kob-muted text-[10px]">▾</span>
          </button>

          {open && (
            <ul
              role="listbox"
              className="absolute left-0 top-full mt-1 z-50 min-w-[9rem] rounded border border-kob-border bg-kob-surface shadow-lg overflow-hidden"
            >
              {DIAL_CODES.map(({ code, iso, country }) => (
                <li key={code}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={code === dialCode}
                    onClick={() => handleDialSelect(code)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors hover:bg-kob-black ${
                      code === dialCode ? 'text-kob-red' : 'text-kob-white'
                    }`}
                  >
                    <span className={`fi fi-${iso} rounded-sm`} style={{ fontSize: '1.1rem', lineHeight: 1 }} />
                    <span className="tabular-nums">{code}</span>
                    <span className="text-kob-muted text-xs">{country}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Divider */}
        <div className="w-px bg-kob-border shrink-0" />

        {/* Number input */}
        <input
          type="tel"
          value={local}
          onChange={(e) => handleLocalChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 min-w-0 bg-kob-black px-3 py-2 text-sm text-kob-white placeholder:text-kob-muted focus:outline-none"
        />
      </div>

      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  )
}
