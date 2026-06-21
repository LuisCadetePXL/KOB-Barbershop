'use client'

import { useState, useTransition } from 'react'
import { updateOpeningHour } from './actions'
import type { OpeningHours } from '@/types/database'

// 0 = Sunday in DB; display Monday-first (same convention as public site)
const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const INPUT =
  'rounded border border-kob-border bg-kob-black px-3 py-2 text-sm text-kob-white focus:border-kob-red focus:outline-none disabled:opacity-40'
const BTN_PRIMARY =
  'rounded bg-kob-red px-4 py-2 text-sm font-medium text-white hover:bg-kob-red-dark disabled:opacity-50'
const BTN_GHOST =
  'rounded border border-kob-border px-3 py-1.5 text-sm text-kob-muted hover:text-kob-white'

function HourRow({ hour }: { hour: OpeningHours }) {
  const [isPending, startTransition] = useTransition()
  const [closed, setClosed] = useState(hour.closed)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    formData.set('closed', closed.toString())
    startTransition(async () => {
      const result = await updateOpeningHour(null, formData)
      if (result.error) { setError(result.error) }
      else { setEditing(false); setSaved(true); setTimeout(() => setSaved(false), 2000) }
    })
  }

  return (
    <div className="border-b border-kob-border last:border-0">
      {/* Display row */}
      {!editing && (
        <div className="flex items-center gap-4 px-4 py-3">
          <span className="w-28 text-sm font-medium text-kob-white">{DAY_LABELS[hour.day_of_week]}</span>
          <span className="flex-1 text-sm text-kob-muted">
            {hour.closed
              ? 'Closed'
              : `${hour.opens_at?.slice(0, 5)} – ${hour.closes_at?.slice(0, 5)}`}
          </span>
          {saved && <span className="text-xs text-green-400">Saved</span>}
          <button onClick={() => { setEditing(true); setError(null); setSaved(false) }} className={BTN_GHOST}>
            Edit
          </button>
        </div>
      )}

      {/* Edit row */}
      {editing && (
        <form onSubmit={handleSubmit} className="px-4 py-3 space-y-3">
          <input type="hidden" name="day_of_week" value={hour.day_of_week} />
          <div className="flex flex-wrap items-end gap-3">
            <span className="w-28 text-sm font-medium text-kob-white pt-1">{DAY_LABELS[hour.day_of_week]}</span>
            <div>
              <label className="block text-xs text-kob-muted mb-1">Opens at</label>
              <input
                name="opens_at"
                type="time"
                defaultValue={hour.opens_at?.slice(0, 5) ?? ''}
                disabled={closed}
                className={INPUT}
              />
            </div>
            <div>
              <label className="block text-xs text-kob-muted mb-1">Closes at</label>
              <input
                name="closes_at"
                type="time"
                defaultValue={hour.closes_at?.slice(0, 5) ?? ''}
                disabled={closed}
                className={INPUT}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-kob-white cursor-pointer pb-1">
              <button
                type="button"
                onClick={() => setClosed((v) => !v)}
                aria-label={closed ? 'Closed — click to open' : 'Open — click to close'}
                className={`relative w-11 h-6 rounded-full transition-colors ${closed ? 'bg-kob-red' : 'bg-kob-border'}`}
              >
                <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${closed ? 'left-[22px]' : 'left-0.5'}`} />
              </button>
              Closed
            </label>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={isPending} className={BTN_PRIMARY}>
              {isPending ? 'Saving…' : 'Save'}
            </button>
            <button type="button" onClick={() => { setEditing(false); setClosed(hour.closed) }} className={BTN_GHOST}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

export default function OpeningHoursClient({ hours }: { hours: OpeningHours[] }) {
  // Sort Monday-first: (day_of_week + 6) % 7 → Mon=0 … Sun=6
  const sorted = [...hours].sort((a, b) => ((a.day_of_week + 6) % 7) - ((b.day_of_week + 6) % 7))

  return (
    <div>
      <h1 className="text-2xl font-display font-bold text-kob-white mb-6">Opening Hours</h1>
      <div className="rounded-lg border border-kob-border bg-kob-dark overflow-hidden">
        {sorted.map((hour) => (
          <HourRow key={hour.id} hour={hour} />
        ))}
      </div>
      <p className="mt-3 text-xs text-kob-muted">Click Edit on a row to change its hours. Changes take effect on the public site immediately.</p>
    </div>
  )
}
