'use client'

import { useState, useTransition } from 'react'
import { cancelAppointment } from './actions'
import type { AppointmentRow } from './page'

const BTN_DANGER =
  'rounded border border-red-800 px-3 py-1.5 text-xs text-red-400 hover:bg-red-900/20 disabled:opacity-50'
const BTN_GHOST =
  'rounded border border-kob-border px-3 py-1.5 text-xs text-kob-muted hover:text-kob-white'

function SourceBadge({ source }: { source: 'website' | 'external' }) {
  if (source === 'external') {
    return (
      <span className="inline-block rounded-full border border-amber-700 bg-amber-900/20 px-2 py-0.5 text-[10px] uppercase tracking-widest text-amber-400">
        Telefoon
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

function AppointmentRow({ appt }: { appt: AppointmentRow }) {
  const [isPending, startTransition] = useTransition()
  const [confirm, setConfirm]       = useState(false)
  const [error, setError]           = useState<string | null>(null)

  const date = new Date(appt.start_time)
  const end  = new Date(appt.end_time)
  const dateLabel = date.toLocaleDateString('nl-BE', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  })
  const timeLabel = `${date.toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' })} – ${end.toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' })}`

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
        {/* Date + time + badges */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-kob-white">{dateLabel}</span>
          <span className="text-xs text-kob-muted">{timeLabel}</span>
          <StatusBadge status={appt.status} />
          <SourceBadge source={appt.source} />
        </div>
        {/* Customer */}
        <p className="text-sm text-kob-white">
          {appt.customer_name}
          {appt.customer_phone && (
            <span className="ml-2 text-kob-muted">{appt.customer_phone}</span>
          )}
        </p>
        {/* Barber + service */}
        <p className="text-xs text-kob-muted">
          {appt.barbers?.name ?? '—'}
          {appt.services?.name_en && (
            <> · {appt.services.name_en}</>
          )}
        </p>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>

      {/* Cancel action (only for confirmed) */}
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

export default function AppointmentsClient({ appointments }: { appointments: AppointmentRow[] }) {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-kob-white">Appointments</h1>
        <p className="mt-1 text-sm text-kob-muted">
          Showing the {appointments.length} most recent appointments (online + telephone).
        </p>
      </div>

      <div className="rounded-lg border border-kob-border bg-kob-dark overflow-hidden">
        {appointments.length === 0 && (
          <p className="p-6 text-kob-muted text-sm">No appointments yet.</p>
        )}
        {appointments.map((appt) => (
          <AppointmentRow key={appt.id} appt={appt} />
        ))}
      </div>
    </div>
  )
}
