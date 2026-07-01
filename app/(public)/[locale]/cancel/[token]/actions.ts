'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { deleteCalendarEvent } from '@/lib/google-calendar'
import { sendWhatsApp, barberCancellationMessage, barberLateCancellationMessage } from '@/lib/twilio'

const LATE_THRESHOLD_MS = 90 * 60 * 1000 // 1.5 hours

export type CancelResult =
  | { status: 'cancelled'; late: boolean }
  | { status: 'error'; message: string }

export async function cancelAppointment(token: string): Promise<CancelResult> {
  const admin = createAdminClient()

  const { data: appt, error } = await admin
    .from('appointments')
    .select(`
      id, status, start_time, cancel_token, cancelled_at,
      customer_name, customer_phone,
      google_calendar_event_id,
      barbers ( name, whatsapp_number, google_calendar_id ),
      services ( name_en, price )
    `)
    .eq('cancel_token', token)
    .single()

  if (error || !appt) return { status: 'error', message: 'invalid_token' }
  if (appt.status === 'cancelled') return { status: 'error', message: 'already_cancelled' }

  const startTime = new Date(appt.start_time)
  const now       = new Date()

  if (startTime < now) return { status: 'error', message: 'already_past' }

  const msUntilStart = startTime.getTime() - now.getTime()
  const isLate       = msUntilStart < LATE_THRESHOLD_MS

  const cancellationType = isLate ? 'late' : 'on_time'

  const { error: updateError } = await admin
    .from('appointments')
    .update({
      status:            'cancelled',
      cancelled_at:      now.toISOString(),
      cancellation_type: cancellationType,
    })
    .eq('id', appt.id)

  if (updateError) return { status: 'error', message: updateError.message }

  const barber  = Array.isArray(appt.barbers)  ? appt.barbers[0]  : appt.barbers  as { name: string; whatsapp_number: string | null; google_calendar_id: string | null } | null
  const service = Array.isArray(appt.services) ? appt.services[0] : appt.services as { name_en: string; price: number } | null

  // Delete Google Calendar event (best-effort)
  if (appt.google_calendar_event_id && barber?.google_calendar_id) {
    await deleteCalendarEvent(barber.google_calendar_id, appt.google_calendar_event_id)
  }

  const serviceName = service?.name_en ?? 'Afspraak'
  const servicePrice = Number(service?.price ?? 0)
  const amountOwed   = Math.round(servicePrice / 2 * 100) / 100

  // Extract Brussels local date/time from the stored UTC start_time
  const dateStr = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Brussels', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(startTime) // YYYY-MM-DD
  const timeStr = new Intl.DateTimeFormat('nl-BE', {
    timeZone: 'Europe/Brussels', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(startTime) // HH:MM

  if (isLate && servicePrice > 0) {
    await admin.from('late_cancellation_fees').insert({
      appointment_id: appt.id,
      customer_name:  appt.customer_name,
      customer_phone: appt.customer_phone,
      amount_owed:    amountOwed,
    })
  }

  if (barber?.whatsapp_number) {
    const msg = isLate
      ? barberLateCancellationMessage({
          customerName:  appt.customer_name,
          serviceName,
          date:          dateStr,
          time:          timeStr,
          customerPhone: appt.customer_phone,
          amountOwed,
        })
      : barberCancellationMessage({
          customerName: appt.customer_name,
          serviceName,
          date:         dateStr,
          time:         timeStr,
        })

    await sendWhatsApp(barber.whatsapp_number, msg)
  }

  return { status: 'cancelled', late: isLate }
}
