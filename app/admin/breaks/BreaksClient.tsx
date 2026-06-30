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

// Belgian week order: Monday first. [dayOfWeek (0=Sun), label]
const DAYS: [number, string][] = [
  [1, 'Monday'], [2, 'Tuesday'], [3, 'Wednesday'], [4, 'Thursday'],
  [5, 'Friday'], [6, 'Saturday'], [0, 'Sunday'],
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

function formatTime(t: string) { return t.slice(0, 5) }

function breakDescription(b: BreakRow) {
  if (b.recurring && b.day_of_week != null) return `Every ${DAY_NAMES[b.day_of_week]}`
  if (!b.recurring && b.date) {
    return new Date(b.date + 'T00:00:00').toLocaleDateString('en-GB', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    })
  }
  return '—'
}

function sortBreaks(list: BreakRow[]) {
  return [...list].sort((a, b) => {
    // recurring first
    if (a.recurring !== b.recurring) return a.recurring ? -1 : 1
    if (a.recurring && b.recurring) return (a.day_of_week ?? 0) - (b.day_of_week ?? 0)
    return (a.date ?? '').localeCompare(b.date ?? '')
  })
}

// ── Section component ─────────────────────────────────────────────────────────

function BreakSection({
  title,
  breaks,
  selectedIds,
  onToggle,
  onToggleAll,
}: {
  title: string
  breaks: BreakRow[]
  selectedIds: Set<string>
  onToggle: (id: string) => void
  onToggleAll: (ids: string[], select: boolean) => void
}) {
  const ids = breaks.map((b) => b.id)
  const allChecked = ids.length > 0 && ids.every((id) => selectedIds.has(id))
  const someChecked = ids.some((id) => selectedIds.has(id))

  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-2">
        <input
          type="checkbox"
          checked={allChecked}
          ref={(el) => { if (el) el.indeterminate = someChecked && !allChecked }}
          onChange={() => onToggleAll(ids, !allChecked)}
          className="accent-kob-red"
        />
        <h2 className="text-sm font-semibold uppercase tracking-widest text-kob-muted">{title}</h2>
        <span className="text-xs text-kob-border">({breaks.length})</span>
      </div>

      <div className="rounded-lg border border-kob-border bg-kob-dark overflow-hidden">
        {breaks.map((b, i) => (
          <div
            key={b.id}
            className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? 'border-t border-kob-border' : ''} ${
              selectedIds.has(b.id) ? 'bg-kob-surface/40' : ''
            }`}
          >
            <input
              type="checkbox"
              checked={selectedIds.has(b.id)}
              onChange={() => onToggle(b.id)}
              className="accent-kob-red shrink-0"
            />
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
              <p className="text-xs text-kob-muted">{breakDescription(b)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function BreaksClient({
  breaks,
  barbers,
}: {
  breaks: BreakRow[]
  barbers: BarberRow[]
}) {
  // Add form state
  const [showAdd, setShowAdd]           = useState(false)
  const [recurring, setRecurring]       = useState(true)
  const [selectedDays, setSelectedDays] = useState<number[]>([])
  const [addError, setAddError]         = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  // Multi-select delete state
  const [selectedIds, setSelectedIds]   = useState<Set<string>>(new Set())
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteError, setDeleteError]   = useState<string | null>(null)

  const [isPending, startTransition] = useTransition()

  // ── Day checkboxes
  const allDaysSelected = selectedDays.length === DAYS.length
  function toggleDay(dow: number) {
    setSelectedDays((p) => p.includes(dow) ? p.filter((d) => d !== dow) : [...p, dow])
  }
  function toggleAllDays() {
    setSelectedDays(allDaysSelected ? [] : DAYS.map(([d]) => d))
  }

  // ── Row selection
  function toggleId(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleSection(ids: string[], select: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      ids.forEach((id) => select ? next.add(id) : next.delete(id))
      return next
    })
  }

  const allIds = breaks.map((b) => b.id)
  const allRowsSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id))
  const someRowsSelected = allIds.some((id) => selectedIds.has(id))

  function toggleAllRows() {
    if (allRowsSelected) setSelectedIds(new Set())
    else setSelectedIds(new Set(allIds))
  }

  // ── Add submit
  function handleAddSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setAddError(null)
    startTransition(async () => {
      const fd = new FormData(e.currentTarget)
      fd.set('recurring', String(recurring))
      if (recurring) selectedDays.forEach((d) => fd.append('day_of_week', String(d)))
      const result = await addBreak(null, fd)
      if (result.error) { setAddError(result.error) }
      else { formRef.current?.reset(); setShowAdd(false); setRecurring(true); setSelectedDays([]) }
    })
  }

  // ── Delete selected
  function handleDeleteSelected() {
    setDeleteError(null)
    startTransition(async () => {
      const ids = [...selectedIds]
      const results = await Promise.all(ids.map((id) => deleteBreak(id)))
      const failed = results.filter((r) => r.error)
      if (failed.length > 0) setDeleteError(`${failed.length} deletion(s) failed.`)
      setSelectedIds(new Set())
      setConfirmDelete(false)
    })
  }

  // ── Group breaks
  const allBarberBreaks = sortBreaks(breaks.filter((b) => b.barber_id === null))
  const byBarber = barbers.map((bar) => ({
    barber: bar,
    breaks: sortBreaks(breaks.filter((b) => b.barber_id === bar.id)),
  })).filter((g) => g.breaks.length > 0)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold text-kob-white">Breaks</h1>
        <button onClick={() => { setShowAdd(true); setAddError(null) }} className={BTN_PRIMARY}>
          + Add break
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <form
          ref={formRef}
          onSubmit={handleAddSubmit}
          className="rounded-lg border border-kob-red/40 bg-kob-black p-4 space-y-3 mb-6"
        >
          <p className="text-sm font-medium text-kob-white">New break</p>

          <div className="flex gap-2">
            {[true, false].map((isRecurring) => (
              <button
                key={String(isRecurring)}
                type="button"
                onClick={() => setRecurring(isRecurring)}
                className={`flex-1 rounded border px-3 py-2 text-sm transition-colors ${
                  recurring === isRecurring
                    ? 'border-kob-red bg-kob-red/10 text-kob-white'
                    : 'border-kob-border text-kob-muted hover:text-kob-white'
                }`}
              >
                {isRecurring ? 'Recurring (weekly)' : 'One-time (specific date)'}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Barber (leave blank = all barbers)</label>
              <select name="barber_id" className={SELECT}>
                <option value="">All barbers</option>
                {barbers.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>

            {recurring ? (
              <div className="sm:col-span-2">
                <label className={LABEL}>Days *</label>
                <div className="rounded border border-kob-border bg-kob-black p-3">
                  <label className="flex items-center gap-2 cursor-pointer select-none mb-2">
                    <input type="checkbox" checked={allDaysSelected} onChange={toggleAllDays} className="accent-kob-red" />
                    <span className="text-sm font-medium text-kob-white">All days</span>
                  </label>
                  <div className="border-t border-kob-border mb-2" />
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
              <input name="label" placeholder="e.g. Lunch break, Personal appointment" className={INPUT} />
            </div>
          </div>

          {addError && <p className="text-xs text-red-400">{addError}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={isPending} className={BTN_PRIMARY}>
              {isPending ? 'Adding…' : 'Add'}
            </button>
            <button
              type="button"
              onClick={() => { setShowAdd(false); setAddError(null); setRecurring(true); setSelectedDays([]) }}
              className={BTN_GHOST}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Multi-select toolbar */}
      {breaks.length > 0 && (
        <div className="flex items-center gap-3 mb-4">
          <input
            type="checkbox"
            checked={allRowsSelected}
            ref={(el) => { if (el) el.indeterminate = someRowsSelected && !allRowsSelected }}
            onChange={toggleAllRows}
            className="accent-kob-red"
          />
          <span className="text-xs text-kob-muted">Select all</span>

          {selectedIds.size > 0 && !confirmDelete && (
            <button
              onClick={() => setConfirmDelete(true)}
              className={BTN_DANGER}
            >
              Delete selected ({selectedIds.size})
            </button>
          )}

          {confirmDelete && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-amber-400">
                Delete {selectedIds.size} break{selectedIds.size !== 1 ? 's' : ''}?
              </span>
              <button
                disabled={isPending}
                onClick={handleDeleteSelected}
                className="rounded bg-red-700 px-3 py-1.5 text-xs text-white hover:bg-red-800 disabled:opacity-50"
              >
                {isPending ? '…' : 'Confirm'}
              </button>
              <button onClick={() => setConfirmDelete(false)} className={BTN_GHOST}>
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {deleteError && (
        <p className="mb-4 text-sm text-red-400 rounded border border-red-800 px-3 py-2 bg-red-900/10">
          {deleteError}
        </p>
      )}

      {/* Grouped list */}
      {breaks.length === 0 && (
        <p className="text-kob-muted text-sm">No breaks configured.</p>
      )}

      {allBarberBreaks.length > 0 && (
        <BreakSection
          title="All barbers"
          breaks={allBarberBreaks}
          selectedIds={selectedIds}
          onToggle={toggleId}
          onToggleAll={toggleSection}
        />
      )}

      {byBarber.map(({ barber, breaks: barberBreaks }) => (
        <BreakSection
          key={barber.id}
          title={barber.name}
          breaks={barberBreaks}
          selectedIds={selectedIds}
          onToggle={toggleId}
          onToggleAll={toggleSection}
        />
      ))}
    </div>
  )
}
