// GET /api/cron/send-reminders
// Called by an external cron service daily (recommended: 18:00 Brussels time).
//
// Required environment variables:
//   CRON_SECRET          — same secret as used for sync-calendars
//   SUPABASE_SERVICE_ROLE_KEY
//   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM
//
// What it does:
//   Finds all confirmed website appointments on tomorrow (Brussels calendar day)
//   that haven't received a reminder yet, and sends a WhatsApp message to the customer.
//   Sets reminder_sent = true after a successful send to prevent duplicates.

import { createAdminClient } from '@/lib/supabase/admin'
import { sendWhatsApp, customerReminderMessage } from '@/lib/twilio'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Returns the UTC start and end instants that bracket a Brussels calendar day.
// e.g. '2026-06-27' → { start: T22:00:00Z (prev day), end: T22:00:00Z (same day) } for UTC+2
function brusselsDayUTCRange(dateStr: string): { start: Date; end: Date } {
  const midnight = new Date(`${dateStr}T00:00:00Z`)
  const brusselsStr = midnight.toLocaleString('sv', { timeZone: 'Europe/Brussels' })
  const offsetMs = new Date(brusselsStr.replace(' ', 'T') + 'Z').getTime() - midnight.getTime()
  const start = new Date(midnight.getTime() - offsetMs)
  const end   = new Date(start.getTime() + 24 * 60 * 60 * 1000)
  return { start, end }
}

export async function GET(request: Request) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const cronSecret = request.headers.get('x-cron-secret')
  if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── Compute tomorrow in Brussels time ────────────────────────────────────
  const tomorrowDate = new Intl.DateTimeFormat('sv', {
    timeZone: 'Europe/Brussels',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date(Date.now() + 24 * 60 * 60 * 1000))
  // tomorrowDate = "2026-06-27"

  const { start, end } = brusselsDayUTCRange(tomorrowDate)

  const admin = createAdminClient()

  // ── Fetch appointments needing a reminder ─────────────────────────────────
  const { data: appointments, error } = await admin
    .from('appointments')
    .select(`
      id,
      customer_name,
      customer_phone,
      start_time,
      barbers ( name ),
      services ( name_en )
    `)
    .eq('status', 'confirmed')
    .eq('source', 'website')
    .eq('reminder_sent', false)
    .gte('start_time', start.toISOString())
    .lt('start_time', end.toISOString())

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  let sent    = 0
  let skipped = 0
  const errors: string[] = []

  for (const appt of appointments ?? []) {
    if (!appt.customer_phone) { skipped++; continue }

    // Format time as HH:MM Brussels local
    const time = new Date(appt.start_time).toLocaleTimeString('nl-BE', {
      hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Brussels',
    })

    const barber  = Array.isArray(appt.barbers)  ? appt.barbers[0]  : appt.barbers  as { name: string } | null
    const service = Array.isArray(appt.services) ? appt.services[0] : appt.services as { name_en: string } | null

    const message = customerReminderMessage({
      customerName: appt.customer_name,
      serviceName:  service?.name_en ?? 'afspraak',
      barberName:   barber?.name ?? 'uw barber',
      time,
    })

    const ok = await sendWhatsApp(appt.customer_phone, message)

    if (ok) {
      // Mark as sent so re-runs don't duplicate
      await admin
        .from('appointments')
        .update({ reminder_sent: true })
        .eq('id', appt.id)
      sent++
    } else {
      errors.push(`Appointment ${appt.id}: send failed`)
    }
  }

  return Response.json({
    ok:      errors.length === 0,
    date:    tomorrowDate,
    sent,
    skipped,
    errors:  errors.length ? errors : undefined,
  })
}
