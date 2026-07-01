// Shared logic for generating recurring appointments.
// Used by: /admin/recurring-clients/actions.ts and /api/cron/generate-recurring

import { randomUUID } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createCalendarEvent } from '@/lib/google-calendar'
import { sendWhatsApp } from '@/lib/twilio'

export type PatternType = 'weekly' | 'biweekly' | 'triweekly' | 'monthly'

export type RecurringClientRow = {
  id: string
  barber_id: string
  customer_name: string
  customer_phone: string
  service_id: string | null
  start_time: string         // "HH:MM:SS" — Brussels wall-clock time
  pattern_type: PatternType
  day_of_week: number        // 0=Sun, 1=Mon … 6=Sat
  week_of_month: number | null  // 1–4 or -1 (last); only for 'monthly'
  barbers: {
    name: string
    google_calendar_id: string | null
    whatsapp_number: string | null
  } | null
  services: {
    name_en: string
    duration_minutes: number
  } | null
}

export type GenerateResult = {
  created: number
  skipped: number    // already existed (dedup)
  conflicts: number  // real slot conflicts from other bookings
}

// ── Date helpers ──────────────────────────────────────────────────────────────

function brusselsTodayStr(): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Brussels',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date())
}

function addDaysStr(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function addMonthsStr(dateStr: string, months: number): string {
  const d = new Date(dateStr + 'T12:00:00Z')
  d.setUTCMonth(d.getUTCMonth() + months)
  return d.toISOString().slice(0, 10)
}

function getDayOfWeekForDate(dateStr: string): number {
  return new Date(dateStr + 'T12:00:00Z').getDay()
}

// Convert Brussels wall-clock datetime to real UTC timestamptz.
function brusselsToUTC(dateStr: string, timeHHMM: string): Date {
  const naiveUtc = new Date(`${dateStr}T${timeHHMM}:00Z`)
  const brusselsString = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Brussels',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).format(naiveUtc)
  const brusselsAsUtc = new Date(brusselsString.replace(' ', 'T') + 'Z')
  const offsetMs = brusselsAsUtc.getTime() - naiveUtc.getTime()
  return new Date(naiveUtc.getTime() - offsetMs)
}

// Find the nth occurrence of dayOfWeek in a given month.
// nth: 1–4 = first/second/third/fourth, -1 = last.
// Returns YYYY-MM-DD or null if the nth occurrence doesn't exist.
function nthDayOfWeekInMonth(year: number, month: number, dow: number, nth: number): string | null {
  const pad = (n: number) => String(n).padStart(2, '0')

  if (nth === -1) {
    for (let d = 31; d >= 1; d--) {
      const dt = new Date(Date.UTC(year, month, d))
      if (dt.getUTCMonth() !== month) continue
      const s = `${year}-${pad(month + 1)}-${pad(d)}`
      if (getDayOfWeekForDate(s) === dow) return s
    }
    return null
  }

  let count = 0
  for (let d = 1; d <= 31; d++) {
    const dt = new Date(Date.UTC(year, month, d))
    if (dt.getUTCMonth() !== month) break
    const s = `${year}-${pad(month + 1)}-${pad(d)}`
    if (getDayOfWeekForDate(s) === dow) {
      count++
      if (count === nth) return s
    }
  }
  return null
}

// ── Pattern date generators ───────────────────────────────────────────────────

function generateIntervalDates(
  intervalDays: number,
  dayOfWeek: number,
  anchorDateStr: string | null,  // null = derive from fromDateStr
  fromDateStr: string,
  toDateStr: string,
): string[] {
  let anchor = anchorDateStr
  if (!anchor) {
    const fromDow = getDayOfWeekForDate(fromDateStr)
    const skip = (dayOfWeek - fromDow + 7) % 7
    anchor = addDaysStr(fromDateStr, skip)
  }

  const anchorMs = new Date(anchor + 'T12:00:00Z').getTime()
  const fromMs   = new Date(fromDateStr + 'T12:00:00Z').getTime()
  const toMs     = new Date(toDateStr + 'T12:00:00Z').getTime()
  const stepMs   = intervalDays * 86_400_000

  // First n such that anchor + n*step >= fromMs
  let n = Math.ceil((fromMs - anchorMs) / stepMs)
  if (n < 0) n = 0

  const dates: string[] = []
  while (true) {
    const t = anchorMs + n * stepMs
    if (t > toMs) break
    dates.push(new Date(t).toISOString().slice(0, 10))
    n++
  }
  return dates
}

function generateMonthlyDates(
  dayOfWeek: number,
  weekOfMonth: number,
  fromDateStr: string,
  toDateStr: string,
): string[] {
  const from = new Date(fromDateStr + 'T12:00:00Z')
  const to   = new Date(toDateStr   + 'T12:00:00Z')
  const dates: string[] = []

  let year  = from.getUTCFullYear()
  let month = from.getUTCMonth()

  while (new Date(Date.UTC(year, month, 1)) <= to) {
    const s = nthDayOfWeekInMonth(year, month, dayOfWeek, weekOfMonth)
    if (s && s >= fromDateStr && s <= toDateStr) dates.push(s)
    month++
    if (month > 11) { month = 0; year++ }
  }
  return dates
}

function generateDatesForPattern(
  pattern: PatternType,
  dayOfWeek: number,
  weekOfMonth: number | null,
  anchorDateStr: string | null,
  fromDateStr: string,
  toDateStr: string,
): string[] {
  switch (pattern) {
    case 'weekly':
      return generateIntervalDates(7, dayOfWeek, anchorDateStr, fromDateStr, toDateStr)
    case 'biweekly':
      return generateIntervalDates(14, dayOfWeek, anchorDateStr, fromDateStr, toDateStr)
    case 'triweekly':
      return generateIntervalDates(21, dayOfWeek, anchorDateStr, fromDateStr, toDateStr)
    case 'monthly':
      return generateMonthlyDates(dayOfWeek, weekOfMonth!, fromDateStr, toDateStr)
  }
}

// ── Main generation function ──────────────────────────────────────────────────

export async function generateAppointmentsForClient(
  client: RecurringClientRow,
  admin: SupabaseClient,
  horizonMonths = 3,
): Promise<GenerateResult> {
  if (!client.service_id || !client.services) {
    return { created: 0, skipped: 0, conflicts: 0 }
  }

  const today   = brusselsTodayStr()
  const horizon = addMonthsStr(today, horizonMonths)
  const timeHHMM = client.start_time.slice(0, 5)

  // Fetch all existing appointments for this client (for dedup + anchor)
  const { data: existing } = await admin
    .from('appointments')
    .select('id, start_time')
    .eq('recurring_client_id', client.id)
    .order('start_time', { ascending: true })

  // Normalize existing start_times to UTC ISO strings for exact matching
  const existingStartTimes = new Set(
    (existing ?? []).map((a) => new Date(a.start_time).toISOString()),
  )

  // Determine anchor for biweekly/triweekly phase
  let anchorDateStr: string | null = null
  if (existing && existing.length > 0) {
    anchorDateStr = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Europe/Brussels',
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date(existing[0].start_time))
  }

  const dates = generateDatesForPattern(
    client.pattern_type,
    client.day_of_week,
    client.week_of_month,
    anchorDateStr,
    today,
    horizon,
  )

  let created   = 0
  let skipped   = 0
  let conflicts = 0

  for (const dateStr of dates) {
    const startUTC = brusselsToUTC(dateStr, timeHHMM)
    const endUTC   = new Date(startUTC.getTime() + client.services.duration_minutes * 60_000)

    // Dedup: already created for this client at this time?
    if (existingStartTimes.has(startUTC.toISOString())) {
      skipped++
      continue
    }

    // Conflict: any OTHER confirmed appointment for this barber at this time?
    const { data: conflicting } = await admin
      .from('appointments')
      .select('id')
      .eq('barber_id', client.barber_id)
      .eq('status', 'confirmed')
      .lt('start_time', endUTC.toISOString())
      .gt('end_time', startUTC.toISOString())
      .limit(1)

    if (conflicting && conflicting.length > 0) {
      conflicts++
      if (client.barbers?.whatsapp_number) {
        const dateFormatted = new Date(dateStr + 'T12:00:00Z').toLocaleDateString('nl-BE', {
          weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC',
        })
        const msg = [
          '⚠️ Conflict vaste klant — KOB',
          '',
          `Kon geen afspraak aanmaken voor ${client.customer_name}:`,
          `📅 ${dateFormatted} · ${timeHHMM}`,
          `✂️ ${client.services.name_en}`,
          'Reden: tijdslot al bezet.',
          'Pas dit manueel aan via het admin panel.',
        ].join('\n')
        await sendWhatsApp(client.barbers.whatsapp_number, msg)
      }
      continue
    }

    // Create appointment
    const appointmentId = randomUUID()
    const cancelToken   = randomUUID()

    const { error } = await admin.from('appointments').insert({
      id:                  appointmentId,
      barber_id:           client.barber_id,
      service_id:          client.service_id,
      customer_name:       client.customer_name,
      customer_phone:      client.customer_phone,
      start_time:          startUTC.toISOString(),
      end_time:            endUTC.toISOString(),
      status:              'confirmed',
      source:              'recurring',
      cancel_token:        cancelToken,
      recurring_client_id: client.id,
    })

    if (error) continue

    // Google Calendar event (best-effort)
    if (client.barbers?.google_calendar_id) {
      const calEventId = await createCalendarEvent({
        calendarId:    client.barbers.google_calendar_id,
        summary:       `${client.services.name_en} — ${client.customer_name}`,
        appointmentId,
        startTime:     startUTC,
        endTime:       endUTC,
      })
      if (calEventId) {
        await admin
          .from('appointments')
          .update({ google_calendar_event_id: calEventId })
          .eq('id', appointmentId)
      }
    }

    created++
    // Add to set so we don't re-create within the same run
    existingStartTimes.add(startUTC.toISOString())
  }

  return { created, skipped, conflicts }
}
