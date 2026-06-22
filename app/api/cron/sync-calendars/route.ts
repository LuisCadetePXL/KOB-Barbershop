// POST /api/cron/sync-calendars
// Called by an external cron service (e.g. cron-job.org) every 10 minutes.
//
// Required environment variables:
//   CRON_SECRET                  — random secret string, set in cron-job.org as
//                                  header x-cron-secret: <value>
//   SUPABASE_SERVICE_ROLE_KEY    — Supabase service role key (bypasses RLS)
//   GOOGLE_SERVICE_ACCOUNT_EMAIL — service account email
//   GOOGLE_PRIVATE_KEY           — service account private key (with literal \n)
//
// What it does:
//   For each barber with a google_calendar_id configured:
//   1. Fetch all Calendar events for the next 30 days.
//   2. Events WITHOUT the kob_website marker → upsert as 'external' appointments
//      (these block the corresponding slots on the public booking page).
//   3. External appointments in the DB whose Calendar event no longer exists → mark cancelled.
//   4. Website appointments (source='website') whose linked Calendar event was deleted
//      by the barber → mark cancelled.
//
// Note: if a barber *moves* a website event in their Calendar, that change is ignored.
// Time changes should be made via the admin panel, not by dragging Calendar events.

import { createAdminClient } from '@/lib/supabase/admin'
import { listCalendarEvents, KOB_SOURCE_MARKER } from '@/lib/google-calendar'

// All times are stored as real UTC throughout the system:
//   - Website bookings (book/actions.ts): converts Europe/Brussels local → real UTC before INSERT
//   - External Calendar events (this file): Google sends real UTC → stored as-is
//   - get_available_slots (migration 0009): generates slots via AT TIME ZONE 'Europe/Brussels'
// Do NOT convert Calendar times before storing — they are already correct UTC.

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const cronSecret = request.headers.get('x-cron-secret')
  if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  // ── Barbers with Calendar configured ─────────────────────────────────────
  const { data: barbers, error: barbersErr } = await admin
    .from('barbers')
    .select('id, name, google_calendar_id')
    .not('google_calendar_id', 'is', null)

  if (barbersErr) {
    return Response.json({ error: barbersErr.message }, { status: 500 })
  }

  if (!barbers?.length) {
    return Response.json({ ok: true, message: 'No barbers with Calendar configured.' })
  }

  const timeMin = new Date()
  const timeMax = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days ahead

  let totalUpserted  = 0
  let totalCancelled = 0
  const errors: string[] = []

  for (const barber of barbers) {
    if (!barber.google_calendar_id) continue

    try {
      const events = await listCalendarEvents(barber.google_calendar_id, timeMin, timeMax)

      // Split into website-created vs. barber-created events
      const websiteEvents  = events.filter(
        (e) => e.extendedProperties?.private?.['source'] === KOB_SOURCE_MARKER,
      )
      const externalEvents = events.filter(
        (e) =>
          e.extendedProperties?.private?.['source'] !== KOB_SOURCE_MARKER &&
          e.start?.dateTime && // skip all-day events (no specific time)
          e.end?.dateTime &&
          e.status !== 'cancelled', // Google marks deleted recurring instances as 'cancelled'
      )

      // ── 1. Upsert external events as blocked appointments ───────────────
      for (const event of externalEvents) {
        if (!event.id || !event.start?.dateTime || !event.end?.dateTime) continue

        const startTime = new Date(event.start.dateTime)
        const endTime   = new Date(event.end.dateTime)

        // Skip events that are already fully in the past
        if (endTime < timeMin) continue

        const { error: upsertErr } = await admin.from('appointments').upsert(
          {
            barber_id:               barber.id,
            service_id:              null,
            customer_name:           event.summary ?? 'Telefonische afspraak',
            customer_phone:          '',
            start_time:              startTime.toISOString(),
            end_time:                endTime.toISOString(),
            status:                  'confirmed',
            source:                  'external',
            google_calendar_event_id: event.id,
          },
          {
            onConflict:       'google_calendar_event_id',
            ignoreDuplicates: false, // update existing rows so already-imported events with wrong times get corrected
          },
        )

        if (!upsertErr) {
          totalUpserted++
        } else if (upsertErr.code !== '23P01') {
          // 23P01 = EXCLUDE constraint — overlaps with an existing booking; skip silently
          errors.push(`Barber ${barber.name}, event ${event.id}: ${upsertErr.message}`)
        }
      }

      // ── 2. Cancel external appointments whose event was deleted ─────────
      const activeExternalIds = new Set(
        externalEvents.map((e) => e.id).filter((id): id is string => !!id),
      )

      const { data: existingExternal } = await admin
        .from('appointments')
        .select('id, google_calendar_event_id')
        .eq('barber_id', barber.id)
        .eq('source', 'external')
        .eq('status', 'confirmed')
        .gte('start_time', timeMin.toISOString())
        .lte('start_time', timeMax.toISOString())

      for (const appt of existingExternal ?? []) {
        if (
          appt.google_calendar_event_id &&
          !activeExternalIds.has(appt.google_calendar_event_id)
        ) {
          await admin
            .from('appointments')
            .update({ status: 'cancelled' })
            .eq('id', appt.id)
          totalCancelled++
        }
      }

      // ── 3. Cancel website appointments whose Calendar event was deleted ──
      const activeWebsiteIds = new Set(
        websiteEvents.map((e) => e.id).filter((id): id is string => !!id),
      )

      const { data: confirmedWebsite } = await admin
        .from('appointments')
        .select('id, google_calendar_event_id')
        .eq('barber_id', barber.id)
        .eq('source', 'website')
        .eq('status', 'confirmed')
        .not('google_calendar_event_id', 'is', null)
        .gte('start_time', timeMin.toISOString())
        .lte('start_time', timeMax.toISOString())

      for (const appt of confirmedWebsite ?? []) {
        if (
          appt.google_calendar_event_id &&
          !activeWebsiteIds.has(appt.google_calendar_event_id)
        ) {
          await admin
            .from('appointments')
            .update({ status: 'cancelled' })
            .eq('id', appt.id)
          totalCancelled++
        }
      }
    } catch (err) {
      errors.push(`Barber ${barber.name}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return Response.json({
    ok:        errors.length === 0,
    upserted:  totalUpserted,
    cancelled: totalCancelled,
    errors:    errors.length ? errors : undefined,
  })
}
