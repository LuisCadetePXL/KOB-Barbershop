'use server'

import { randomUUID } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createCalendarEvent } from '@/lib/google-calendar'

export interface SlotResult {
  slots: string[]
  closed: boolean
}

/**
 * Returns available 15-minute slot start times (HH:MM) for a barber on a date.
 * Uses a security-definer Postgres function so anon users can check availability
 * without being able to read appointment customer data directly.
 */
export async function getAvailableSlots(
  barberId: string,
  date: string,           // YYYY-MM-DD
  durationMinutes: number,
): Promise<SlotResult> {
  const supabase = await createClient()

  // Check if the shop/barber is explicitly closed on this date before calling
  // the heavier RPC, so we can return a meaningful `closed` flag to the UI.
  const { data: closedRows } = await supabase
    .from('closed_dates')
    .select('id')
    .eq('date', date)
    .or(`barber_id.is.null,barber_id.eq.${barberId}`)
    .limit(1)

  if (closedRows && closedRows.length > 0) {
    return { slots: [], closed: true }
  }

  // Also check regular weekly opening hours
  const dayOfWeek = new Date(date + 'T12:00:00Z').getDay() // noon UTC avoids DST edge
  const { data: hours } = await supabase
    .from('opening_hours')
    .select('closed')
    .eq('day_of_week', dayOfWeek)
    .single()

  if (!hours || hours.closed) {
    return { slots: [], closed: true }
  }

  // Fetch available slots via security-definer function (reads appointments internally)
  const { data: slots, error } = await supabase.rpc('get_available_slots', {
    p_barber_id: barberId,
    p_date: date,
    p_duration_mins: durationMinutes,
  })

  if (error) return { slots: [], closed: false }

  return { slots: (slots as string[]) ?? [], closed: false }
}

export interface CreateAppointmentInput {
  barberId: string
  serviceId: string
  date: string   // YYYY-MM-DD
  time: string   // HH:MM
  durationMinutes: number
  customerName: string
  customerPhone: string
}

export interface CreateAppointmentResult {
  error?: string
}

/**
 * Inserts a confirmed appointment. Anon users are allowed by RLS (public INSERT policy).
 * Returns { error: 'slot_taken' } when the EXCLUDE constraint fires — the UI shows a
 * message and returns the user to the time-slot step with refreshed availability.
 *
 * Times are stored as real UTC (Europe/Brussels local time converted to UTC).
 * get_available_slots uses AT TIME ZONE 'Europe/Brussels' to match the same convention.
 */
export async function createAppointment(
  input: CreateAppointmentInput,
): Promise<CreateAppointmentResult> {
  const supabase = await createClient()

  // Server-side validation (mirrors client-side checks; client can be bypassed)
  if (!input.customerName.trim()) return { error: 'Name is required.' }
  const strippedPhone = input.customerPhone.replace(/[\s\-\.\(\)]/g, '')
  if (!/^\+?[0-9]{9,15}$/.test(strippedPhone)) {
    return { error: 'Phone number is invalid. Please use an international format, e.g. +32 476 00 00 00.' }
  }

  const appointmentId = randomUUID()
  // Convert Europe/Brussels wall-clock time to UTC (handles DST automatically).
  // Step 1: treat the chosen time as UTC naively to get a reference instant.
  // Step 2: ask Intl what Brussels shows at that instant (sv-SE gives "YYYY-MM-DD HH:MM:SS").
  // Step 3: parse that string explicitly as UTC (append Z) → brussels offset in ms.
  // Step 4: subtract the offset to get the real UTC instant.
  // e.g. 12:00 Brussels (UTC+2): naiveUtc=12:00Z, Brussels shows 14:00, offset=+2h → result=10:00Z ✓
  // Parsing via sv-SE+Z avoids the new Date(localeString) local-timezone trap.
  const naiveUtc = new Date(`${input.date}T${input.time}:00Z`)
  const brusselsString = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Brussels',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).format(naiveUtc) // → "2026-06-21 14:00:00"
  const brusselsAsUtc = new Date(brusselsString.replace(' ', 'T') + 'Z')
  const offsetMs = brusselsAsUtc.getTime() - naiveUtc.getTime()
  const startTime = new Date(naiveUtc.getTime() - offsetMs)
  const endTime = new Date(startTime.getTime() + input.durationMinutes * 60_000)

  const { error } = await supabase
    .from('appointments')
    .insert({
      id: appointmentId,
      barber_id: input.barberId,
      service_id: input.serviceId,
      customer_name: input.customerName.trim(),
      customer_phone: input.customerPhone.trim(),
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      status: 'confirmed',
      source: 'website',
    })

  if (error) {
    // 23P01 = exclusion_violation — another booking just took this slot
    if (error.code === '23P01') return { error: 'slot_taken' }
    return { error: error.message }
  }

  // Create Calendar event (best-effort — a failure here doesn't affect the confirmed booking)
  const admin = createAdminClient()
  const [{ data: barber }, { data: service }] = await Promise.all([
    admin.from('barbers').select('google_calendar_id').eq('id', input.barberId).single(),
    admin.from('services').select('name_en').eq('id', input.serviceId).single(),
  ])

  if (barber?.google_calendar_id) {
    const summary = `${service?.name_en ?? 'Afspraak'} — ${input.customerName.trim()}`
    const calEventId = await createCalendarEvent({
      calendarId: barber.google_calendar_id,
      summary,
      appointmentId,
      startTime,
      endTime,
    })
    if (calEventId) {
      await admin
        .from('appointments')
        .update({ google_calendar_event_id: calEventId })
        .eq('id', appointmentId)
    }
  }

  return {}
}
