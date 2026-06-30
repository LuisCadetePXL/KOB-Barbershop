'use client'

import { useRef, useState, useTransition } from 'react'
import { addBreak, deleteBreak } from './actions'

const INPUT =
  'w-full rounded border border-kob-border bg-kob-black px-3 py-2 text-sm text-kob-white placeholder:text-kob-muted focus:border-kob-red focus:outline-none'
const SELECT =
  'w-full rounded border border-kob-border bg-kob-black px-3 py-2 text-sm text-kob-white focus:border-kob-red focus:outline-none'
const BTN_PRIMARY =
  'rounded bg-kob-red px-4 py-2 text-sm font-medium text-white hover:bg-kob-red-dark disabled:opacity-50'
const BTN_GHOST =
  'rounded border border-kob-border px-3 py-1.5 text-sm text-kob-muted hover:text-kob-white'
const BTN_DANGER =
  'rounded border border-red-800 px-3 py-1.5 text-sm text-red-400 hover:bg-red-900/20'
const LABEL = 'block text-xs font-medium text-kob-muted mb-1'

// Belgian week order: Monday first. Each entry: [dayOfWeek (0=Sun), label]
const DAYS: [number, string][] = [
  [1, 'Monday'],
  [2, 'Tuesday'],
  [3, 'Wednesday'],
  [4, 'Thursday'],
  [5, 'Friday'],
  [6, 'Saturday'],
  [0, 'Sunday'],
]
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

type BarberRow = { id: string; name: string }
type BreakRow = {
  id: string
  barber_id: string | null
  recurring: boolean
  day_of_week: number | null
  date: string | null
  start_time: string
  end_time: string
  label: string
  barbers: { name: string } | null
}

function formatTime(t: string) {
  return t.slice(0, 5)
}

function breakDescription(b: BreakRow) {
  if (b.recurring && b.day_of_week != null) return `Every ${DAY_NAMES[b.day_of_week]}`
  if (!b.recurring && b.date) {
    return new Date(b.date + 'T00:00:00').toLocaleDateString('en-GB', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    })
  }
  return '—'
}

export default function BreaksClient({
  breaks,
  barbers,
}: {
  breaks: BreakRow[]
  barbers: BarberRow[]
}) {
  const [showAdd, setShowAdd]         = useState(false)
  const [recurring, setRecurring]     = useState(true)
  const [selectedDays, setSelectedDays] = useState<number[]>([])
  const [confirmId, setConfirmId]     = useState<string | null>(null)
  const [error, setError]             = useState<string | null>(null)
  const [isPending, startTransition]  = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  const allSelected = selectedDays.length === DAYS.length

  function toggleDay(dow: number) {
    setSelectedDays((prev) =>
      prev.includes(dow) ? prev.filter((d) => d !== dow) : [...prev, dow],
    )
  }

  function toggleAll() {
    setSelectedDays(allSelected ? [] : DAYS.map(([dow]) => dow))
  }

  function handleAddSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const fd = new FormData(e.currentTarget)
      fd.set('recurring', String(recurring))
      // Remove any day_of_week entries added by hidden inputs, then add selected days
      if (recurring) {
        // FormData from the form won't have day_of_week checkboxes since we manage them in state
        selectedDays.forEach((dow) => fd.append('day_of_week', String(dow)))
      }
      const result = await addBreak(null, fd)
      if (result.error) {
        setError(result.error)
      } else {
        formRef.current?.reset()
        setShowAdd(false)
        setRecurring(true)
        setSelectedDays([])
      }
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteBreak(id)
      if (result.error) setError(result.error)
      else setConfirmId(null)
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold text-kob-white">Breaks</h1>
        <button onClick={() => { setShowAdd(true); setError(null) }} className={BTN_PRIMARY}>
          + Add break
        </button>
      </div>

      {showAdd && (
        <form
          ref={formRef}
          onSubmit={handleAddSubmit}
          className="rounded-lg border border-kob-red/40 bg-kob-black p-4 space-y-3 mb-4"
        >
          <p className="text-sm font-medium text-kob-white">New break</p>

          {/* Type toggle */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setRecurring(true)}
              className={`flex-1 rounded border px-3 py-2 text-sm transition-colors ${
                recurring
                  ? 'border-kob-red bg-kob-red/10 text-kob-white'
                  : 'border-kob-border text-kob-muted hover:text-kob-white'
              }`}
            >
              Recurring (weekly)
            </button>
            <button
              type="button"
              onClick={() => setRecurring(false)}
              className={`flex-1 rounded border px-3 py-2 text-sm transition-colors ${
                !recurring
                  ? 'border-kob-red bg-kob-red/10 text-kob-white'
                  : 'border-kob-border text-kob-muted hover:text-kob-white'
              }`}
            >
              One-time (specific date)
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Barber (leave blank = all barbers)</label>
              <select name="barber_id" className={SELECT}>
                <option value="">All barbers</option>
                {barbers.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            {recurring ? (
              <div className="sm:col-span-2">
                <label className={LABEL}>Days *</label>
                <div className="rounded border border-kob-border bg-kob-black p-3 space-y-2">
                  {/* All days toggle */}
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      className="accent-kob-red"
                    />
                    <span className="text-sm font-medium text-kob-white">All days</span>
                  </label>
                  <div className="border-t border-kob-border my-1" />
                  <div className="grid grid-cols-2 gap-1">
                    {DAYS.map(([dow, name]) => (
                      <label key={dow} className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={selectedDays.includes(dow)}
                          onChange={() => toggleDay(dow)}
                          className="accent-kob-red"
                        />
                        <span className="text-sm text-kob-white">{name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <label className={LABEL}>Date *</label>
                <input name="date" type="date" required className={INPUT} />
              </div>
            )}

            <div>
              <label className={LABEL}>Start time *</label>
              <input name="start_time" type="time" required step={900} className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>End time *</label>
              <input name="end_time" type="time" required step={900} className={INPUT} />
            </div>

            <div className="sm:col-span-2">
              <label className={LABEL}>Label</label>
              <input
                name="label"
                placeholder="e.g. Lunch break, Personal appointment"
                className={INPUT}
              />
            </div>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex gap-2">
            <button type="submit" disabled={isPending} className={BTN_PRIMARY}>
              {isPending ? 'Adding…' : 'Add'}
            </button>
            <button
              type="button"
              onClick={() => { setShowAdd(false); setError(null); setRecurring(true); setSelectedDays([]) }}
              className={BTN_GHOST}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {!showAdd && error && (
        <p className="mb-4 text-sm text-red-400 rounded border border-red-800 px-3 py-2 bg-red-900/10">
          {error}
        </p>
      )}

      <div className="rounded-lg border border-kob-border bg-kob-dark overflow-hidden">
        {breaks.length === 0 && (
          <p className="p-6 text-kob-muted text-sm">No breaks configured.</p>
        )}
        {breaks.map((b, i) => (
          <div
            key={b.id}
            className={`flex items-center gap-4 px-4 py-3 ${i > 0 ? 'border-t border-kob-border' : ''}`}
          >
            {/* Recurring indicator */}
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${
              b.recurring
                ? 'bg-blue-900/30 text-blue-400 border border-blue-800/40'
                : 'bg-kob-surface text-kob-muted border border-kob-border'
            }`}>
              {b.recurring ? 'Weekly' : 'Once'}
            </span>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-kob-white">
                {b.label || 'Break'}
                <span className="ml-2 text-kob-muted font-normal">
                  {formatTime(b.start_time)}–{formatTime(b.end_time)}
                </span>
              </p>
              <p className="text-xs text-kob-muted">
                {breakDescription(b)}
                {' · '}
                {b.barbers ? b.barbers.name : 'All barbers'}
              </p>
            </div>

            {confirmId === b.id ? (
              <div className="flex items-center gap-2">
                <span className="text-kob-muted text-xs">Delete?</span>
                <button
                  disabled={isPending}
                  onClick={() => handleDelete(b.id)}
                  className="rounded bg-red-700 px-3 py-1.5 text-xs text-white hover:bg-red-800 disabled:opacity-50"
                >
                  {isPending ? '…' : 'Confirm'}
                </button>
                <button onClick={() => setConfirmId(null)} className={BTN_GHOST}>Cancel</button>
              </div>
            ) : (
              <button onClick={() => setConfirmId(b.id)} className={BTN_DANGER}>Delete</button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
