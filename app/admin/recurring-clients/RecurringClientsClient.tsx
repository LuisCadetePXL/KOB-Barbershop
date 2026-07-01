'use client'

import { useRef, useState, useTransition } from 'react'
import { addRecurringClient, deactivateRecurringClient } from './actions'
import type { PatternType } from '@/lib/recurring-appointments'

const INPUT  = 'w-full rounded border border-kob-border bg-kob-black px-3 py-2 text-sm text-kob-white placeholder:text-kob-muted focus:border-kob-red focus:outline-none'
const SELECT = 'w-full rounded border border-kob-border bg-kob-black px-3 py-2 text-sm text-kob-white focus:border-kob-red focus:outline-none'
const BTN_PRIMARY = 'rounded bg-kob-red px-4 py-2 text-sm font-medium text-white hover:bg-kob-red-dark disabled:opacity-50'
const BTN_GHOST   = 'rounded border border-kob-border px-3 py-1.5 text-sm text-kob-muted hover:text-kob-white'
const BTN_DANGER  = 'rounded border border-red-800 px-3 py-1.5 text-sm text-red-400 hover:bg-red-900/20 disabled:opacity-50'
const LABEL = 'block text-xs font-medium text-kob-muted mb-1'

// Belgian week order
const DAYS: [number, string][] = [
  [1, 'Monday'], [2, 'Tuesday'], [3, 'Wednesday'], [4, 'Thursday'],
  [5, 'Friday'], [6, 'Saturday'], [0, 'Sunday'],
]

const PATTERN_LABELS: Record<PatternType, string> = {
  weekly:    'Every week',
  biweekly:  'Every 2 weeks',
  triweekly: 'Every 3 weeks',
  monthly:   'Monthly',
}

const WEEK_OF_MONTH_LABELS: [number, string][] = [
  [1, '1st'], [2, '2nd'], [3, '3rd'], [4, '4th'], [-1, 'Last'],
]

type BarberOption  = { id: string; name: string }
type ServiceOption = { id: string; name_en: string; duration_minutes: number }

type ClientRow = {
  id: string
  barber_id: string
  customer_name: string
  customer_phone: string
  service_id: string | null
  start_time: string
  pattern_type: PatternType
  day_of_week: number
  week_of_month: number | null
  active: boolean
  notes: string | null
  barbers: { name: string } | null
  services: { name_en: string } | null
}

function patternDescription(c: ClientRow): string {
  const dayName = DAYS.find(([d]) => d === c.day_of_week)?.[1] ?? '?'
  if (c.pattern_type === 'monthly' && c.week_of_month != null) {
    const wLabel = WEEK_OF_MONTH_LABELS.find(([w]) => w === c.week_of_month)?.[1] ?? '?'
    return `${wLabel} ${dayName} of the month`
  }
  return `${PATTERN_LABELS[c.pattern_type]}, ${dayName}`
}

function formatTime(t: string) { return t.slice(0, 5) }

// ── Add form ──────────────────────────────────────────────────────────────────

function AddForm({
  barbers,
  services,
  onClose,
}: {
  barbers: BarberOption[]
  services: ServiceOption[]
  onClose: () => void
}) {
  const [pattern, setPattern]       = useState<PatternType>('weekly')
  const [error,   setError]         = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await addRecurringClient(null, new FormData(e.currentTarget))
      if (result.error) { setError(result.error) }
      else { formRef.current?.reset(); onClose() }
    })
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="rounded-lg border border-kob-red/40 bg-kob-black p-5 space-y-4 mb-6"
    >
      <p className="text-sm font-semibold text-kob-white">New recurring client</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Barber */}
        <div>
          <label className={LABEL}>Barber *</label>
          <select name="barber_id" required className={SELECT}>
            <option value="">Choose barber…</option>
            {barbers.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>

        {/* Service */}
        <div>
          <label className={LABEL}>Service</label>
          <select name="service_id" className={SELECT}>
            <option value="">No service</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>{s.name_en} ({s.duration_minutes} min)</option>
            ))}
          </select>
        </div>

        {/* Customer name */}
        <div>
          <label className={LABEL}>Customer name *</label>
          <input name="customer_name" required placeholder="Full name" className={INPUT} />
        </div>

        {/* Phone */}
        <div>
          <label className={LABEL}>Phone</label>
          <input name="customer_phone" placeholder="+32476000000" className={INPUT} />
        </div>

        {/* Start time */}
        <div>
          <label className={LABEL}>Appointment time *</label>
          <input name="start_time" type="time" required step={900} className={INPUT} />
        </div>

        {/* Pattern type */}
        <div>
          <label className={LABEL}>Pattern *</label>
          <select
            name="pattern_type"
            value={pattern}
            onChange={(e) => setPattern(e.target.value as PatternType)}
            required
            className={SELECT}
          >
            <option value="weekly">Every week</option>
            <option value="biweekly">Every 2 weeks</option>
            <option value="triweekly">Every 3 weeks</option>
            <option value="monthly">Monthly (same weekday)</option>
          </select>
        </div>

        {/* Day of week */}
        <div>
          <label className={LABEL}>Day of week *</label>
          <select name="day_of_week" required className={SELECT}>
            <option value="">Choose day…</option>
            {DAYS.map(([dow, name]) => (
              <option key={dow} value={dow}>{name}</option>
            ))}
          </select>
        </div>

        {/* Week of month (only for monthly) */}
        {pattern === 'monthly' && (
          <div>
            <label className={LABEL}>Which week *</label>
            <select name="week_of_month" required className={SELECT}>
              <option value="">Choose…</option>
              {WEEK_OF_MONTH_LABELS.map(([w, label]) => (
                <option key={w} value={w}>{label}</option>
              ))}
            </select>
          </div>
        )}

        {/* Notes */}
        <div className="sm:col-span-2">
          <label className={LABEL}>Notes (internal)</label>
          <input name="notes" placeholder="Optional internal note…" className={INPUT} />
        </div>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="flex gap-2">
        <button type="submit" disabled={isPending} className={BTN_PRIMARY}>
          {isPending ? 'Saving…' : 'Add & generate appointments'}
        </button>
        <button type="button" onClick={onClose} className={BTN_GHOST}>Cancel</button>
      </div>
    </form>
  )
}

// ── Client row ────────────────────────────────────────────────────────────────

function ClientRow({
  client,
  futureCount,
}: {
  client: ClientRow
  futureCount: number
}) {
  const [confirm,   setConfirm]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleDeactivate() {
    startTransition(async () => {
      const result = await deactivateRecurringClient(client.id)
      if (result.error) { setError(result.error); setConfirm(false) }
    })
  }

  return (
    <div className="flex items-center gap-4 px-4 py-3 border-t border-kob-border first:border-t-0">
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-0.5">
          <span className="text-sm font-medium text-kob-white">{client.customer_name}</span>
          {client.customer_phone && (
            <span className="text-xs text-kob-muted">{client.customer_phone}</span>
          )}
          {!client.active && (
            <span className="rounded-full border border-kob-border px-2 py-0.5 text-[10px] uppercase tracking-widest text-kob-muted">
              Inactive
            </span>
          )}
          {client.active && futureCount > 0 && (
            <span className="rounded-full border border-green-800 bg-green-900/20 px-2 py-0.5 text-[10px] text-green-400">
              {futureCount} upcoming
            </span>
          )}
        </div>
        <p className="text-xs text-kob-muted">
          {patternDescription(client)} · {formatTime(client.start_time)}
          {client.services && <> · {client.services.name_en}</>}
        </p>
        {client.notes && <p className="text-xs text-kob-border mt-0.5">{client.notes}</p>}
        {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
      </div>

      {client.active && (
        <div className="flex items-center gap-2 shrink-0">
          {confirm ? (
            <>
              <span className="text-xs text-amber-400">Cancel {futureCount} future appointments?</span>
              <button
                disabled={isPending}
                onClick={handleDeactivate}
                className="rounded bg-red-700 px-3 py-1.5 text-xs text-white hover:bg-red-800 disabled:opacity-50"
              >
                {isPending ? '…' : 'Confirm'}
              </button>
              <button onClick={() => setConfirm(false)} className={BTN_GHOST}>No</button>
            </>
          ) : (
            <button onClick={() => setConfirm(true)} className={BTN_DANGER}>Deactivate</button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function RecurringClientsClient({
  clients,
  barbers,
  services,
  futureCountMap,
}: {
  clients: ClientRow[]
  barbers: BarberOption[]
  services: ServiceOption[]
  futureCountMap: Record<string, number>
}) {
  const [showAdd, setShowAdd] = useState(false)

  // Group by barber name, then "Inactive" at the end
  const groups: { barberName: string; clients: ClientRow[] }[] = []
  const seen = new Map<string, ClientRow[]>()

  for (const c of clients.filter((c) => c.active)) {
    const name = c.barbers?.name ?? 'Unknown'
    if (!seen.has(name)) { seen.set(name, []); groups.push({ barberName: name, clients: seen.get(name)! }) }
    seen.get(name)!.push(c)
  }

  const inactiveClients = clients.filter((c) => !c.active)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-kob-white">Recurring Clients</h1>
          <p className="mt-1 text-sm text-kob-muted">
            Fixed clients with automatic appointment generation for the next 3 months.
          </p>
        </div>
        {!showAdd && (
          <button onClick={() => setShowAdd(true)} className={BTN_PRIMARY}>
            + Add client
          </button>
        )}
      </div>

      {showAdd && (
        <AddForm
          barbers={barbers}
          services={services}
          onClose={() => setShowAdd(false)}
        />
      )}

      {clients.length === 0 && !showAdd && (
        <p className="text-kob-muted text-sm">No recurring clients yet.</p>
      )}

      {/* Active clients grouped by barber */}
      {groups.map(({ barberName, clients: groupClients }) => (
        <div key={barberName} className="mb-6">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-kob-muted mb-2">
            {barberName}
          </h2>
          <div className="rounded-lg border border-kob-border bg-kob-dark overflow-hidden">
            {groupClients.map((c) => (
              <ClientRow key={c.id} client={c} futureCount={futureCountMap[c.id] ?? 0} />
            ))}
          </div>
        </div>
      ))}

      {/* Inactive clients */}
      {inactiveClients.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-kob-muted mb-2">
            Inactive
          </h2>
          <div className="rounded-lg border border-kob-border bg-kob-dark overflow-hidden">
            {inactiveClients.map((c) => (
              <ClientRow key={c.id} client={c} futureCount={0} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
