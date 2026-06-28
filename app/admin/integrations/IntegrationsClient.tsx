'use client'

import { useState, useTransition } from 'react'
import { updateBarberCalendarId, updateBarberWhatsAppNumber } from './actions'

const INPUT =
  'w-full rounded border border-kob-border bg-kob-black px-3 py-2 text-sm text-kob-white placeholder:text-kob-muted focus:border-kob-red focus:outline-none font-mono'
const BTN_PRIMARY =
  'rounded bg-kob-red px-4 py-2 text-sm font-medium text-white hover:bg-kob-red-dark disabled:opacity-50'

type BarberRow = {
  id: string
  name: string
  google_calendar_id: string | null
  whatsapp_number: string | null
}

function BarberCalendarRow({ barber }: { barber: BarberRow }) {
  const [value, setValue]     = useState(barber.google_calendar_id ?? '')
  const [saved, setSaved]     = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    setError(null); setSaved(false)
    startTransition(async () => {
      const result = await updateBarberCalendarId(barber.id, value)
      if (result.error) setError(result.error)
      else setSaved(true)
    })
  }

  return (
    <div className="border-t border-kob-border px-4 py-4 first:border-t-0">
      <p className="text-sm font-medium text-kob-white mb-1">{barber.name}</p>
      <p className="text-xs text-kob-muted mb-2">
        Find this in Google Calendar → Settings → Integrate calendar → Calendar ID
      </p>
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
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
      {saved && <p className="mt-1 text-xs text-green-400">Saved.</p>}
    </div>
  )
}

function BarberWhatsAppRow({ barber }: { barber: BarberRow }) {
  const [value, setValue]     = useState(barber.whatsapp_number ?? '')
  const [saved, setSaved]     = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    setError(null); setSaved(false)
    startTransition(async () => {
      const result = await updateBarberWhatsAppNumber(barber.id, value)
      if (result.error) setError(result.error)
      else setSaved(true)
    })
  }

  return (
    <div className="border-t border-kob-border px-4 py-4 first:border-t-0">
      <p className="text-sm font-medium text-kob-white mb-1">{barber.name}</p>
      <p className="text-xs text-kob-muted mb-2">
        International format, e.g. +32476000000. Leave empty to disable notifications for this barber.
      </p>
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => { setValue(e.target.value); setSaved(false) }}
          placeholder="+32476000000"
          className={INPUT}
        />
        <button onClick={handleSave} disabled={isPending} className={BTN_PRIMARY}>
          {isPending ? 'Saving…' : 'Save'}
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
      {saved && <p className="mt-1 text-xs text-green-400">Saved.</p>}
    </div>
  )
}

export default function IntegrationsClient({
  barbers,
  isDeveloper,
}: {
  barbers: BarberRow[]
  isDeveloper: boolean
}) {
  const noBarbers = (
    <p className="p-6 text-sm text-kob-muted">No barbers found. Add barbers first.</p>
  )

  return (
    <div className="max-w-2xl space-y-10">
      <div>
        <h1 className="text-2xl font-display font-bold text-kob-white">Integrations</h1>
        <p className="mt-1 text-sm text-kob-muted">
          Connect each barber to Google Calendar and WhatsApp notifications.
        </p>
      </div>

      {/* ── WhatsApp ──────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-lg font-semibold text-kob-white mb-1">WhatsApp notifications</h2>
        <p className="text-sm text-kob-muted mb-4">
          The barber receives a WhatsApp message for every new booking and cancellation.
          Customers also receive a confirmation with their cancellation link.
        </p>
        <div className="rounded-lg border border-kob-border bg-kob-dark overflow-hidden">
          {barbers.length === 0 ? noBarbers : barbers.map((b) => (
            <BarberWhatsAppRow key={b.id} barber={b} />
          ))}
        </div>
      </section>

      {/* ── Google Calendar ───────────────────────────────────────────── */}
      <section>
        <h2 className="text-lg font-semibold text-kob-white mb-1">Google Calendar</h2>
        <p className="text-sm text-kob-muted mb-4">
          Bookings are automatically added to the barber's Google Calendar.
          Paste the Calendar ID from Google Calendar settings.
        </p>
        <div className="rounded-lg border border-kob-border bg-kob-dark overflow-hidden">
          {barbers.length === 0 ? noBarbers : barbers.map((b) => (
            <BarberCalendarRow key={b.id} barber={b} />
          ))}
        </div>
      </section>

      {/* ── Developer-only info ───────────────────────────────────────── */}
      {isDeveloper && (
        <section>
          <h2 className="text-lg font-semibold text-kob-white mb-1">Developer info</h2>
          <div className="rounded-lg border border-kob-border bg-kob-dark p-5 space-y-3 text-sm text-kob-muted">
            <p>
              Service account email (share calendars with this address with{' '}
              <em>Make changes to events</em> permission):
            </p>
            <code className="block rounded bg-kob-surface px-3 py-2 text-xs text-kob-white break-all">
              {process.env.NEXT_PUBLIC_SERVICE_ACCOUNT_HINT ?? 'see GOOGLE_SERVICE_ACCOUNT_EMAIL in .env.local'}
            </code>
            <p className="text-xs">
              Calendar sync cron: <code className="rounded bg-kob-surface px-1 py-0.5 text-kob-white">/api/cron/sync-calendars</code>
              {' '}· Reminders cron: <code className="rounded bg-kob-surface px-1 py-0.5 text-kob-white">/api/cron/send-reminders</code>
            </p>
          </div>
        </section>
      )}
    </div>
  )
}
