'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { cancelAppointment, createAdminAppointment, checkOutstandingFees, getAdminAvailableSlots, archiveOldAppointments } from './actions'
import type { AppointmentRow, BarberOption, ServiceOption } from './page'
import PhoneInput, { isValidPhone } from '@/components/ui/PhoneInput'

const BTN_PRIMARY =
  'rounded bg-kob-red px-4 py-2 text-sm font-medium text-white hover:bg-kob-red-dark disabled:opacity-50'
const BTN_DANGER =
  'rounded border border-red-800 px-3 py-1.5 text-xs text-red-400 hover:bg-red-900/20 disabled:opacity-50'
const BTN_GHOST =
  'rounded border border-kob-border px-3 py-1.5 text-xs text-kob-muted hover:text-kob-white'
const SELECT =
  'rounded border border-kob-border bg-kob-black px-3 py-1.5 text-sm text-kob-white focus:border-kob-red focus:outline-none'
const INPUT =
  'w-full rounded border border-kob-border bg-kob-black px-3 py-2 text-sm text-kob-white placeholder:text-kob-muted focus:border-kob-red focus:outline-none'
const INPUT_FULL = INPUT
const LABEL = 'block text-xs font-medium text-kob-muted mb-1'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Brussels',
  })
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    timeZone: 'Europe/Brussels',
  })
}

// ── Badges ────────────────────────────────────────────────────────────────────

function SourceBadge({ source }: { source: 'website' | 'external' | 'recurring' }) {
  if (source === 'external') {
    return (
      <span className="inline-block rounded-full border border-amber-700 bg-amber-900/20 px-2 py-0.5 text-[10px] uppercase tracking-widest text-amber-400">
        Phone
      </span>
    )
  }
  if (source === 'recurring') {
    return (
      <span className="inline-block rounded-full border border-blue-800 bg-blue-900/20 px-2 py-0.5 text-[10px] uppercase tracking-widest text-blue-400">
        Recurring
      </span>
    )
  }
  return (
    <span className="inline-block rounded-full border border-kob-border px-2 py-0.5 text-[10px] uppercase tracking-widest text-kob-muted">
      Online
    </span>
  )
}

function StatusBadge({ status }: { status: 'confirmed' | 'cancelled' | 'archived' }) {
  if (status === 'cancelled') {
    return (
      <span className="inline-block rounded-full border border-red-800 bg-red-900/20 px-2 py-0.5 text-[10px] uppercase tracking-widest text-red-400">
        Cancelled
      </span>
    )
  }
  if (status === 'archived') {
    return (
      <span className="inline-block rounded-full border border-kob-border px-2 py-0.5 text-[10px] uppercase tracking-widest text-kob-muted">
        Archived
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
      if (result.error) { setError(result.error); setConfirm(false) }
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
          {appt.customer_phone && <span className="ml-2 text-kob-muted">{appt.customer_phone}</span>}
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
              <button onClick={handleCancel} disabled={isPending}
                className="rounded bg-red-700 px-3 py-1.5 text-xs text-white hover:bg-red-800 disabled:opacity-50">
                {isPending ? '…' : 'Confirm'}
              </button>
              <button onClick={() => setConfirm(false)} className={BTN_GHOST}>No</button>
            </>
          ) : (
            <button onClick={() => setConfirm(true)} className={BTN_DANGER}>Cancel</button>
          )}
        </div>
      )}
    </div>
  )
}

// ── New appointment form ──────────────────────────────────────────────────────

function NewAppointmentForm({
  barbers,
  services,
  onClose,
}: {
  barbers: BarberOption[]
  services: ServiceOption[]
  onClose: () => void
}) {
  const [barberId,  setBarberId]  = useState('')
  const [serviceId, setServiceId] = useState('')
  const [date,      setDate]      = useState('')
  const [time,      setTime]      = useState('')
  const [name,      setName]      = useState('')
  const [phone,     setPhone]     = useState('+32')
  const [note,      setNote]      = useState('')

  const [slots,     setSlots]     = useState<string[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [slotsClosed,  setSlotsClosed]  = useState(false)

  const [debtWarning, setDebtWarning] = useState<string | null>(null)
  const [debtChecked, setDebtChecked] = useState(false)

  const [error,   setError]   = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const selectedService = services.find((s) => s.id === serviceId)

  // Fetch slots whenever barber + service + date are all set
  useEffect(() => {
    if (!barberId || !serviceId || !date || !selectedService) {
      setSlots([]); setTime(''); return
    }
    setSlotsLoading(true)
    setTime('')
    getAdminAvailableSlots(barberId, date, selectedService.duration_minutes).then(({ slots, closed }) => {
      setSlots(slots)
      setSlotsClosed(closed)
      setSlotsLoading(false)
    })
  }, [barberId, serviceId, date, selectedService])

  // Check outstanding fees when phone changes (debounced minimally)
  useEffect(() => {
    setDebtWarning(null)
    setDebtChecked(false)
    if (!phone.trim() || phone.trim().length < 8) return
    const id = setTimeout(async () => {
      const { totalOwed } = await checkOutstandingFees(phone)
      if (totalOwed > 0) {
        setDebtWarning(`⚠️ This customer has €${totalOwed.toFixed(2)} in outstanding cancellation fees.`)
      }
      setDebtChecked(true)
    }, 600)
    return () => clearTimeout(id)
  }, [phone])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!barberId || !serviceId || !date || !time || !name.trim()) {
      setError('Please fill in all required fields.')
      return
    }
    if (!selectedService) return
    setError(null)
    startTransition(async () => {
      const result = await createAdminAppointment({
        barberId,
        serviceId,
        date,
        time,
        durationMinutes: selectedService.duration_minutes,
        customerName: name,
        customerPhone: phone,
        note,
      })
      if (result.error === 'slot_taken') {
        setError('This slot was just taken. Please choose another time.')
      } else if (result.error) {
        setError(result.error)
      } else {
        onClose()
      }
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-kob-red/40 bg-kob-black p-5 space-y-4 mb-6"
    >
      <p className="text-sm font-semibold text-kob-white">New appointment</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Barber */}
        <div>
          <label className={LABEL}>Barber *</label>
          <select value={barberId} onChange={(e) => setBarberId(e.target.value)}
            className={INPUT_FULL} required>
            <option value="">Choose barber…</option>
            {barbers.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>

        {/* Service */}
        <div>
          <label className={LABEL}>Service *</label>
          <select value={serviceId} onChange={(e) => setServiceId(e.target.value)}
            className={INPUT_FULL} required>
            <option value="">Choose service…</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>{s.name_en} ({s.duration_minutes} min)</option>
            ))}
          </select>
        </div>

        {/* Date */}
        <div>
          <label className={LABEL}>Date *</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className={INPUT_FULL}
          />
        </div>

        {/* Time slot */}
        <div>
          <label className={LABEL}>Time *</label>
          {!barberId || !serviceId || !date ? (
            <p className="text-xs text-kob-muted py-2">Choose barber, service and date first.</p>
          ) : slotsLoading ? (
            <p className="text-xs text-kob-muted py-2">Loading slots…</p>
          ) : slotsClosed ? (
            <p className="text-xs text-amber-400 py-2">Closed on this date.</p>
          ) : slots.length === 0 ? (
            <p className="text-xs text-amber-400 py-2">No slots available.</p>
          ) : (
            <select value={time} onChange={(e) => setTime(e.target.value)}
              className={INPUT_FULL} required>
              <option value="">Choose time…</option>
              {slots.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
        </div>

        {/* Customer name */}
        <div>
          <label className={LABEL}>Customer name *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
            required
            className={INPUT}
          />
        </div>

        {/* Phone */}
        <div>
          <label className={LABEL}>Phone</label>
          <PhoneInput
            value={phone}
            onChange={setPhone}
            placeholder="476 00 00 00"
          />
          {debtChecked && debtWarning && (
            <p className="mt-1 text-xs text-amber-400">{debtWarning}</p>
          )}
        </div>

        {/* Note */}
        <div className="sm:col-span-2">
          <label className={LABEL}>Note (optional)</label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Internal note…"
            className={INPUT}
          />
        </div>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="flex gap-2">
        <button type="submit" disabled={isPending} className={BTN_PRIMARY}>
          {isPending ? 'Saving…' : 'Create appointment'}
        </button>
        <button type="button" onClick={onClose}
          className="rounded border border-kob-border px-4 py-2 text-sm text-kob-muted hover:text-kob-white">
          Cancel
        </button>
      </div>
    </form>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AppointmentsClient({
  appointments,
  barbers,
  services,
  isDeveloper = false,
}: {
  appointments: AppointmentRow[]
  barbers: BarberOption[]
  services: ServiceOption[]
  isDeveloper?: boolean
}) {
  const router = useRouter()
  const [showNew, setShowNew]               = useState(false)
  const [filterBarber, setFilterBarber]     = useState('')
  const [filterDate,   setFilterDate]       = useState('')
  const [filterStatus, setFilterStatus]     = useState('')
  const [filterSource, setFilterSource]     = useState('')
  const [showArchived, setShowArchived]     = useState(false)
  const [archivePending, startArchive]      = useTransition()
  const [archiveResult, setArchiveResult]   = useState<string | null>(null)

  useEffect(() => {
    const id = setInterval(() => router.refresh(), 30_000)
    return () => clearInterval(id)
  }, [router])

  const barberOptions = useMemo(() => {
    const seen = new Set<string>()
    return appointments
      .map((a) => a.barbers?.name ?? '')
      .filter((n) => n && !seen.has(n) && !!seen.add(n))
      .sort()
  }, [appointments])

  const filtered = useMemo(() => {
    return appointments.filter((a) => {
      if (!showArchived && a.status === 'archived') return false
      if (filterBarber && a.barbers?.name !== filterBarber) return false
      if (filterDate && !a.start_time.startsWith(filterDate)) return false
      if (filterStatus && a.status !== filterStatus) return false
      if (filterSource && a.source !== filterSource) return false
      return true
    })
  }, [appointments, filterBarber, filterDate, filterStatus, filterSource, showArchived])

  const hasFilters = filterBarber || filterDate || filterStatus || filterSource

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        <h1 className="text-2xl font-display font-bold text-kob-white">Appointments</h1>
        <div className="flex items-center gap-2">
          {isDeveloper && (
            <button
              onClick={() => startArchive(async () => {
                const r = await archiveOldAppointments()
                setArchiveResult(r.error ? `Error: ${r.error}` : `Archived ${r.archived} appointments.`)
              })}
              disabled={archivePending}
              className="rounded border border-kob-border px-3 py-1.5 text-xs text-kob-muted hover:text-kob-white disabled:opacity-50"
            >
              {archivePending ? 'Archiving…' : 'Archive >6 months'}
            </button>
          )}
          {!showNew && (
            <button onClick={() => setShowNew(true)} className={BTN_PRIMARY}>
              + New appointment
            </button>
          )}
        </div>
      </div>
      {archiveResult && (
        <p className="mb-3 text-xs text-kob-muted">{archiveResult}</p>
      )}
      <p className="mb-5 text-sm text-kob-muted">
        {filtered.length} of {appointments.filter((a) => showArchived || a.status !== 'archived').length} appointments — online + phone.
      </p>

      {showNew && (
        <NewAppointmentForm
          barbers={barbers}
          services={services}
          onClose={() => setShowNew(false)}
        />
      )}

      {/* Filters */}
      <div className="mb-5 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-kob-muted mb-1">Barber</label>
          <select value={filterBarber} onChange={(e) => setFilterBarber(e.target.value)} className={SELECT}>
            <option value="">All barbers</option>
            {barberOptions.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-kob-muted mb-1">Date</label>
          <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className={SELECT} />
        </div>
        <div>
          <label className="block text-xs text-kob-muted mb-1">Status</label>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={SELECT}>
            <option value="">All statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="cancelled">Cancelled</option>
            {showArchived && <option value="archived">Archived</option>}
          </select>
        </div>
        <div>
          <label className="block text-xs text-kob-muted mb-1">Source</label>
          <select value={filterSource} onChange={(e) => setFilterSource(e.target.value)} className={SELECT}>
            <option value="">All sources</option>
            <option value="website">Online</option>
            <option value="external">Phone</option>
            <option value="recurring">Recurring</option>
          </select>
        </div>
        <div className="flex items-center gap-2 self-end pb-1.5">
          <input
            id="show-archived"
            type="checkbox"
            checked={showArchived}
            onChange={(e) => {
              setShowArchived(e.target.checked)
              if (!e.target.checked && filterStatus === 'archived') setFilterStatus('')
            }}
            className="accent-kob-red"
          />
          <label htmlFor="show-archived" className="text-xs text-kob-muted cursor-pointer select-none">
            Show archived
          </label>
        </div>
        {hasFilters && (
          <button
            onClick={() => { setFilterBarber(''); setFilterDate(''); setFilterStatus(''); setFilterSource('') }}
            className={BTN_GHOST}
          >
            Reset filters
          </button>
        )}
      </div>

      <div className="rounded-lg border border-kob-border bg-kob-dark overflow-hidden">
        {filtered.length === 0 && (
          <p className="p-6 text-kob-muted text-sm">
            {hasFilters ? 'No appointments found for these filters.' : 'No appointments yet.'}
          </p>
        )}
        {filtered.map((appt) => <AppointmentItem key={appt.id} appt={appt} />)}
      </div>
    </div>
  )
}
