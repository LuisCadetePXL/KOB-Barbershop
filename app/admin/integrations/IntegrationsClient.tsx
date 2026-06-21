'use client'

import { useState, useTransition } from 'react'
import { updateBarberCalendarId } from './actions'

const INPUT =
  'w-full rounded border border-kob-border bg-kob-black px-3 py-2 text-sm text-kob-white placeholder:text-kob-muted focus:border-kob-red focus:outline-none font-mono'
const BTN_PRIMARY =
  'rounded bg-kob-red px-4 py-2 text-sm font-medium text-white hover:bg-kob-red-dark disabled:opacity-50'

type BarberRow = {
  id: string
  name: string
  google_calendar_id: string | null
}

function BarberCalendarRow({ barber }: { barber: BarberRow }) {
  const [value, setValue]     = useState(barber.google_calendar_id ?? '')
  const [saved, setSaved]     = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    setError(null)
    setSaved(false)
    startTransition(async () => {
      const result = await updateBarberCalendarId(barber.id, value)
      if (result.error) setError(result.error)
      else setSaved(true)
    })
  }

  return (
    <div className="border-t border-kob-border px-4 py-4 first:border-t-0">
      <p className="text-sm font-medium text-kob-white mb-2">{barber.name}</p>
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => { setValue(e.target.value); setSaved(false) }}
          placeholder="primary@group.calendar.google.com"
          className={INPUT}
        />
        <button onClick={handleSave} disabled={isPending} className={BTN_PRIMARY}>
          {isPending ? 'Saving…' : 'Save'}
        </button>
      </div>
      {error  && <p className="mt-1 text-xs text-red-400">{error}</p>}
      {saved  && <p className="mt-1 text-xs text-green-400">Saved.</p>}
    </div>
  )
}

export default function IntegrationsClient({ barbers }: { barbers: BarberRow[] }) {
  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-display font-bold text-kob-white">Integrations</h1>
        <p className="mt-1 text-sm text-kob-muted">Google Calendar two-way sync — developer only.</p>
      </div>

      {/* Setup instructions */}
      <div className="mb-6 rounded-lg border border-kob-border bg-kob-dark p-5 space-y-3 text-sm text-kob-muted">
        <p className="font-medium text-kob-white">Setup per barber</p>
        <ol className="list-decimal list-inside space-y-1.5">
          <li>Open Google Calendar and create a new calendar for this barber (or use an existing one).</li>
          <li>Go to that calendar's settings → <em>Share with specific people</em> → add the service account email:
            <code className="ml-1 rounded bg-kob-surface px-1.5 py-0.5 text-xs text-kob-white">
              {process.env.NEXT_PUBLIC_SERVICE_ACCOUNT_HINT ?? 'see GOOGLE_SERVICE_ACCOUNT_EMAIL in .env.local'}
            </code>
            with <em>Make changes to events</em> permission.
          </li>
          <li>Copy the Calendar ID from its settings page (it looks like an email address) and paste it below.</li>
        </ol>
        <p className="text-xs">
          Leave a field empty to disable Calendar sync for that barber.
          The cron job at <code className="rounded bg-kob-surface px-1 py-0.5 text-kob-white">/api/cron/sync-calendars</code> runs every 10 minutes
          and imports externally created events as blocked slots.
        </p>
      </div>

      {/* Per-barber calendar ID fields */}
      <div className="rounded-lg border border-kob-border bg-kob-dark overflow-hidden">
        {barbers.length === 0 && (
          <p className="p-6 text-sm text-kob-muted">No barbers found. Add barbers first.</p>
        )}
        {barbers.map((barber) => (
          <BarberCalendarRow key={barber.id} barber={barber} />
        ))}
      </div>
    </div>
  )
}
