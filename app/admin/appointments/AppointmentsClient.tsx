'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { cancelAppointment } from './actions'
import type { AppointmentRow } from './page'

const BTN_DANGER =
  'rounded border border-red-800 px-3 py-1.5 text-xs text-red-400 hover:bg-red-900/20 disabled:opacity-50'
const BTN_GHOST =
  'rounded border border-kob-border px-3 py-1.5 text-xs text-kob-muted hover:text-kob-white'
const SELECT =
  'rounded border border-kob-border bg-kob-black px-3 py-1.5 text-sm text-kob-white focus:border-kob-red focus:outline-none'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Brussels',
  })
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Europe/Brussels',
  })
}

// ── Badges ────────────────────────────────────────────────────────────────────

function SourceBadge({ source }: { source: 'website' | 'external' }) {
  if (source === 'external') {
    return (
      <span className="inline-block rounded-full border border-amber-700 bg-amber-900/20 px-2 py-0.5 text-[10px] uppercase tracking-widest text-amber-400">
        Phone
      </span>
    )
  }
  return (
    <span className="inline-block rounded-full border border-kob-border px-2 py-0.5 text-[10px] uppercase tracking-widest text-kob-muted">
      Online
    </span>
  )
}

function StatusBadge({ status }: { status: 'confirmed' | 'cancelled' }) {
  if (status === 'cancelled') {
    return (
      <span className="inline-block rounded-full border border-red-800 bg-red-900/20 px-2 py-0.5 text-[10px] uppercase tracking-widest text-red-400">
        Cancelled
      </span>
    )
  }
  return (
    <span className="inline-block rounded-full border border-green-800 bg-green-900/20 px-2 py-0.5 text-[10px] uppercase tracking-widest text-green-400">
      Confirmed
    </span>
  )
}

// ── Single appointment row ────────────────────────────────────────────────────

function AppointmentItem({ appt }: { appt: AppointmentRow }) {
  const [isPending, startTransition] = useTransition()
  const [confirm, setConfirm]        = useState(false)
  const [error, setError]            = useState<string | null>(null)

  const dateLabel = formatDate(appt.start_time)
  const timeLabel = `${formatTime(appt.start_time)} – ${formatTime(appt.end_time)}`

  function handleCancel() {
    setError(null)
    startTransition(async () => {
      const result = await cancelAppointment(appt.id)
      if (result.error) {
        setError(result.error)
        setConfirm(false)
      }
    })
  }

  return (
    <div className="grid grid-cols-[1fr_auto] gap-4 px-4 py-3 border-t border-kob-border first:border-t-0">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-kob-white">{dateLabel}</span>
          <span className="text-xs text-kob-muted">{timeLabel}</span>
          <StatusBadge status={appt.status} />
          <SourceBadge source={appt.source} />
          {appt.hasDebt && (
            <span className="inline-block rounded-full border border-amber-700 bg-amber-900/20 px-2 py-0.5 text-[10px] uppercase tracking-widest text-amber-400" title="Openstaande schuld van eerdere te-late annulering">
              ⚠ Schuld
            </span>
          )}
        </div>
        <p className="text-sm text-kob-white">
          {appt.customer_name}
          {appt.customer_phone && (
            <span className="ml-2 text-kob-muted">{appt.customer_phone}</span>
          )}
        </p>
        <p className="text-xs text-kob-muted">
          {appt.barbers?.name ?? '—'}
          {appt.services?.name_en && <> · {appt.services.name_en}</>}
        </p>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>

      {appt.status === 'confirmed' && (
        <div className="flex items-start gap-2 pt-0.5">
          {confirm ? (
            <>
              <span className="text-xs text-kob-muted self-center">Cancel?</span>
              <button
                onClick={handleCancel}
                disabled={isPending}
                className="rounded bg-red-700 px-3 py-1.5 text-xs text-white hover:bg-red-800 disabled:opacity-50"
              >
                {isPending ? '…' : 'Confirm'}
              </button>
              <button onClick={() => setConfirm(false)} className={BTN_GHOST}>
                No
              </button>
            </>
          ) : (
            <button onClick={() => setConfirm(true)} className={BTN_DANGER}>
              Cancel
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AppointmentsClient({ appointments }: { appointments: AppointmentRow[] }) {
  const router = useRouter()
  const [filterBarber, setFilterBarber]   = useState('')
  const [filterDate,   setFilterDate]     = useState('')
  const [filterStatus, setFilterStatus]   = useState('')
  const [filterSource, setFilterSource]   = useState('')

  // Poll for new bookings every 30 seconds
  useEffect(() => {
    const id = setInterval(() => router.refresh(), 30_000)
    return () => clearInterval(id)
  }, [router])

  // Unique barber names for the barber dropdown
  const barberOptions = useMemo(() => {
    const seen = new Set<string>()
    return appointments
      .map((a) => a.barbers?.name ?? '')
      .filter((n) => n && !seen.has(n) && !!seen.add(n))
      .sort()
  }, [appointments])

  const filtered = useMemo(() => {
    return appointments.filter((a) => {
      if (filterBarber && a.barbers?.name !== filterBarber) return false
      // Date filter: compare the UTC date portion of start_time with YYYY-MM-DD input
      if (filterDate && !a.start_time.startsWith(filterDate)) return false
      if (filterStatus && a.status !== filterStatus) return false
      if (filterSource && a.source !== filterSource) return false
      return true
    })
  }, [appointments, filterBarber, filterDate, filterStatus, filterSource])

  const hasFilters = filterBarber || filterDate || filterStatus || filterSource

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-kob-white">Appointments</h1>
        <p className="mt-1 text-sm text-kob-muted">
          {filtered.length} of {appointments.length} appointments — online + phone.
        </p>
      </div>

      {/* Filters */}
      <div className="mb-5 flex flex-wrap items-end gap-3">
        {/* Barber */}
        <div>
          <label className="block text-xs text-kob-muted mb-1">Barber</label>
          <select
            value={filterBarber}
            onChange={(e) => setFilterBarber(e.target.value)}
            className={SELECT}
          >
            <option value="">All barbers</option>
            {barberOptions.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>

        {/* Date */}
        <div>
          <label className="block text-xs text-kob-muted mb-1">Date</label>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className={SELECT}
          />
        </div>

        {/* Status */}
        <div>
          <label className="block text-xs text-kob-muted mb-1">Status</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className={SELECT}
          >
            <option value="">All statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Source */}
        <div>
          <label className="block text-xs text-kob-muted mb-1">Source</label>
          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            className={SELECT}
          >
            <option value="">All sources</option>
            <option value="website">Online</option>
            <option value="external">Phone</option>
          </select>
        </div>

        {/* Reset */}
        {hasFilters && (
          <button
            onClick={() => {
              setFilterBarber('')
              setFilterDate('')
              setFilterStatus('')
              setFilterSource('')
            }}
            className={BTN_GHOST}
          >
            Reset filters
          </button>
        )}
      </div>

      {/* List */}
      <div className="rounded-lg border border-kob-border bg-kob-dark overflow-hidden">
        {filtered.length === 0 && (
          <p className="p-6 text-kob-muted text-sm">
            {hasFilters ? 'No appointments found for these filters.' : 'No appointments yet.'}
          </p>
        )}
        {filtered.map((appt) => (
          <AppointmentItem key={appt.id} appt={appt} />
        ))}
      </div>
    </div>
  )
}
