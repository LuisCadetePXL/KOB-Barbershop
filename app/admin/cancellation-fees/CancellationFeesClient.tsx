'use client'

import { useState, useTransition } from 'react'
import { markFeePaid } from './actions'
import type { FeeRow } from './page'

export default function CancellationFeesClient({ fees }: { fees: FeeRow[] }) {
  const [filterBarber, setFilterBarber] = useState('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'paid'>('all')

  // Unique barber names for filter dropdown
  const barberNames = Array.from(
    new Set(
      fees
        .map((f) => {
          const appt = f.appointments
          const barber = appt && (Array.isArray(appt.barbers) ? appt.barbers[0] : appt.barbers)
          return barber?.name ?? null
        })
        .filter(Boolean) as string[]
    )
  ).sort()

  const filtered = fees.filter((f) => {
    const appt   = f.appointments
    const barber = appt && (Array.isArray(appt.barbers) ? appt.barbers[0] : appt.barbers)
    if (filterBarber !== 'all' && barber?.name !== filterBarber) return false
    if (filterStatus === 'open' && f.paid_at !== null) return false
    if (filterStatus === 'paid' && f.paid_at === null) return false
    return true
  })

  const totalOpen = fees
    .filter((f) => !f.paid_at)
    .reduce((sum, f) => sum + Number(f.amount_owed), 0)

  return (
    <div>
      <div className="mb-8 flex flex-col gap-1">
        <h1 className="text-xl font-bold text-kob-white">Late annuleringen</h1>
        <p className="text-sm text-kob-muted">
          Openstaand totaal: <span className="text-amber-400 font-semibold">€{totalOpen.toFixed(2)}</span>
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-3">
        <select
          value={filterBarber}
          onChange={(e) => setFilterBarber(e.target.value)}
          className="border border-kob-border bg-kob-dark px-3 py-2 text-sm text-kob-white focus:border-kob-red focus:outline-none"
        >
          <option value="all">Alle kappers</option>
          {barberNames.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as 'all' | 'open' | 'paid')}
          className="border border-kob-border bg-kob-dark px-3 py-2 text-sm text-kob-white focus:border-kob-red focus:outline-none"
        >
          <option value="all">Alle statussen</option>
          <option value="open">Openstaand</option>
          <option value="paid">Betaald</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-kob-muted text-sm">Geen resultaten gevonden.</p>
      ) : (
        <div className="flex flex-col divide-y divide-kob-border border border-kob-border">
          {filtered.map((fee) => (
            <FeeRow key={fee.id} fee={fee} />
          ))}
        </div>
      )}
    </div>
  )
}

function FeeRow({ fee }: { fee: FeeRow }) {
  const [pending, startTransition] = useTransition()
  const [paid, setPaid] = useState(!!fee.paid_at)

  const appt    = fee.appointments
  const barber  = appt && (Array.isArray(appt.barbers)  ? appt.barbers[0]  : appt.barbers)  as { name: string } | null
  const service = appt && (Array.isArray(appt.services) ? appt.services[0] : appt.services) as { name_en: string } | null

  const apptDate = appt
    ? new Intl.DateTimeFormat('nl-BE', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
        timeZone: 'Europe/Brussels',
      }).format(new Date(appt.start_time))
    : '—'

  function handleMarkPaid() {
    startTransition(async () => {
      const result = await markFeePaid(fee.id)
      if (!result.error) setPaid(true)
    })
  }

  return (
    <div className="flex flex-col gap-3 bg-kob-dark px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-0.5 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-kob-white">{fee.customer_name}</span>
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${paid ? 'bg-green-900/40 text-green-400' : 'bg-amber-900/40 text-amber-400'}`}>
            {paid ? 'Betaald' : 'Openstaand'}
          </span>
        </div>
        <span className="text-sm text-kob-muted">{fee.customer_phone}</span>
        <span className="text-xs text-kob-muted">
          {service?.name_en ?? '—'} · {barber?.name ?? '—'} · {apptDate}
        </span>
      </div>

      <div className="flex items-center gap-4 shrink-0">
        <span className="font-display text-lg font-bold text-amber-400">
          €{Number(fee.amount_owed).toFixed(2)}
        </span>
        {!paid && (
          <button
            onClick={handleMarkPaid}
            disabled={pending}
            className="border border-kob-border px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-kob-muted transition-colors hover:border-green-500 hover:text-green-400 disabled:opacity-50"
          >
            {pending ? '…' : 'Markeer betaald'}
          </button>
        )}
      </div>
    </div>
  )
}
