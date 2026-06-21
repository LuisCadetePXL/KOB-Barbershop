'use client'

import { useRef, useState, useTransition } from 'react'
import { addClosedDate, deleteClosedDate } from './actions'
import type { Barber, ClosedDate } from '@/types/database'

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

type ClosedDateWithBarber = ClosedDate & { barbers: { name: string } | null }

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function checkDuplicate(
  closedDates: ClosedDateWithBarber[],
  date: string,
  barberId: string,
): string | null {
  if (!date) return null
  const shopClosed = closedDates.some((cd) => cd.date === date && cd.barber_id === null)
  if (shopClosed) return 'The entire shop is already marked as closed on this date.'

  const targetBarberId = barberId || null
  const exactMatch = closedDates.some(
    (cd) => cd.date === date && cd.barber_id === targetBarberId,
  )
  if (exactMatch) {
    return targetBarberId === null
      ? 'The entire shop is already marked as closed on this date.'
      : 'This barber is already marked as unavailable on this date.'
  }
  return null
}

export default function ClosedDatesClient({
  closedDates,
  barbers,
}: {
  closedDates: ClosedDateWithBarber[]
  barbers: Barber[]
}) {
  const [showAdd, setShowAdd] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  // Controlled state for the add form so we can show a live preview + duplicate warning
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedBarberId, setSelectedBarberId] = useState('')

  const duplicateWarning = checkDuplicate(closedDates, selectedDate, selectedBarberId)

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteClosedDate(id)
      if (result.error) setError(result.error)
      else setConfirmDeleteId(null)
    })
  }

  function handleAddSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    // Block before hitting the server if we already know it's a duplicate
    if (duplicateWarning) {
      setError(duplicateWarning)
      return
    }

    startTransition(async () => {
      const result = await addClosedDate(null, new FormData(e.currentTarget))
      if (result.error) {
        setError(result.error)
      } else {
        formRef.current?.reset()
        setSelectedDate('')
        setSelectedBarberId('')
        setShowAdd(false)
      }
    })
  }

  function handleClose() {
    setShowAdd(false)
    setError(null)
    setSelectedDate('')
    setSelectedBarberId('')
  }

  const sorted = [...closedDates].sort((a, b) => a.date.localeCompare(b.date))

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold text-kob-white">Closed Dates</h1>
        <button onClick={() => setShowAdd(true)} className={BTN_PRIMARY}>+ Add date</button>
      </div>

      {showAdd && (
        <form
          ref={formRef}
          onSubmit={handleAddSubmit}
          className="rounded-lg border border-kob-red/40 bg-kob-black p-4 space-y-3 mb-4"
        >
          <p className="text-sm font-medium text-kob-white">New closed date</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Date *</label>
              <input
                name="date"
                type="date"
                required
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className={INPUT}
              />
              {/* Live readable preview of the chosen date */}
              {selectedDate && (
                <p className="mt-1 text-xs text-kob-muted">
                  {formatDate(selectedDate)}
                </p>
              )}
            </div>
            <div>
              <label className={LABEL}>Barber (leave blank = whole shop)</label>
              <select
                name="barber_id"
                value={selectedBarberId}
                onChange={(e) => setSelectedBarberId(e.target.value)}
                className={SELECT}
              >
                <option value="">Entire shop</option>
                {barbers.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={LABEL}>Reason (optional)</label>
              <input name="reason" placeholder="e.g. Public holiday, vacation…" className={INPUT} />
            </div>
          </div>

          {/* Duplicate warning shown inline before submit */}
          {duplicateWarning && (
            <p className="text-xs text-amber-400 rounded border border-amber-700/40 bg-amber-900/10 px-3 py-2">
              {duplicateWarning}
            </p>
          )}
          {error && !duplicateWarning && (
            <p className="text-xs text-red-400">{error}</p>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isPending || !!duplicateWarning}
              className={BTN_PRIMARY}
            >
              {isPending ? 'Adding…' : 'Add'}
            </button>
            <button type="button" onClick={handleClose} className={BTN_GHOST}>Cancel</button>
          </div>
        </form>
      )}

      {!showAdd && error && (
        <p className="mb-4 text-sm text-red-400 rounded border border-red-800 px-3 py-2 bg-red-900/10">{error}</p>
      )}

      <div className="rounded-lg border border-kob-border bg-kob-dark overflow-hidden">
        {sorted.length === 0 && (
          <p className="p-6 text-kob-muted text-sm">No closed dates configured.</p>
        )}
        {sorted.map((cd, i) => (
          <div
            key={cd.id}
            className={`flex items-center gap-4 px-4 py-3 ${i > 0 ? 'border-t border-kob-border' : ''}`}
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-kob-white">{formatDate(cd.date)}</p>
              <p className="text-xs text-kob-muted">
                {cd.barbers ? cd.barbers.name : 'Entire shop'}
                {cd.reason && ` · ${cd.reason}`}
              </p>
            </div>
            {confirmDeleteId === cd.id ? (
              <div className="flex items-center gap-2">
                <span className="text-kob-muted text-xs">Delete?</span>
                <button
                  disabled={isPending}
                  onClick={() => handleDelete(cd.id)}
                  className="rounded bg-red-700 px-3 py-1.5 text-xs text-white hover:bg-red-800 disabled:opacity-50"
                >
                  {isPending ? '…' : 'Confirm'}
                </button>
                <button onClick={() => setConfirmDeleteId(null)} className={BTN_GHOST}>Cancel</button>
              </div>
            ) : (
              <button onClick={() => setConfirmDeleteId(cd.id)} className={BTN_DANGER}>Delete</button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
