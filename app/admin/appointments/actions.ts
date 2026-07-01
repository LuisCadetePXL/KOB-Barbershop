'use server'

import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { deleteCalendarEvent, createCalendarEvent } from '@/lib/google-calendar'
import { sendWhatsApp, barberNotificationMessage, customerConfirmationMessage } from '@/lib/twilio'

// ── Available slots (re-exported for admin use) ───────────────────────────────

export async function getAdminAvailableSlots(
  barberId: string,
  date: string,
  durationMinutes: number,
): Promise<{ slots: string[]; closed: boolean }> {
  const supabase = await createClient()

  const { data: closedRows } = await supabase
    .from('closed_dates')
    .select('id')
    .eq('date', date)
    .or(`barber_id.is.null,barber_id.eq.${barberId}`)
    .limit(1)

  if (closedRows && closedRows.length > 0) return { slots: [], closed: true }

  const dayOfWeek = new Date(date + 'T12:00:00Z').getDay()
  const { data: hours } = await supabase
    .from('opening_hours')
    .select('closed')
    .eq('day_of_week', dayOfWeek)
    .single()

  if (!hours || hours.closed) return { slots: [], closed: true }

  const { data: slots, error } = await supabase.rpc('get_available_slots', {
    p_barber_id: barberId,
    p_date: date,
    p_duration_mins: durationMinutes,
  })

  if (error) return { slots: [], closed: false }
  return { slots: (slots as string[]) ?? [], closed: false }
}

export async function cancelAppointment(appointmentId: string): Promise<{ error?: string }> {
  const supabase = await createClient()

  // Fetch the appointment to get the linked Calendar event and barber
  const { data: appt, error: fetchErr } = await supabase
    .from('appointments')
    .select('id, status, google_calendar_event_id, barber_id')
    .eq('id', appointmentId)
    .single()

  if (fetchErr || !appt) return { error: 'Appointment not found.' }
  if (appt.status === 'cancelled') return { error: 'Already cancelled.' }

  // Delete the linked Google Calendar event (if one exists)
  if (appt.google_calendar_event_id) {
    const admin = createAdminClient()
    const { data: barber } = await admin
      .from('barbers')
      .select('google_calendar_id')
      .eq('id', appt.barber_id)
      .single()

    if (barber?.google_calendar_id) {
      await deleteCalendarEvent(barber.google_calendar_id, appt.google_calendar_event_id)
    }
  }

  const { error } = await supabase
    .from('appointments')
    .update({ status: 'cancelled' })
    .eq('id', appointmentId)

  if (error) return { error: error.message }

  revalidatePath('/admin/appointments')
  return {}
}

// ── Admin: check outstanding fees for a phone number ─────────────────────────

export async function checkOutstandingFees(phone: string): Promise<{ totalOwed: number }> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('late_cancellation_fees')
    .select('amount_owed')
    .eq('customer_phone', phone.trim())
    .is('paid_at', null)
  const totalOwed = (data ?? []).reduce((sum, f) => sum + Number(f.amount_owed), 0)
  return { totalOwed }
}

// ── Admin: create appointment ─────────────────────────────────────────────────

export interface AdminCreateAppointmentInput {
  barberId: string
  serviceId: string
  date: string       // YYYY-MM-DD
  time: string       // HH:MM Brussels local
  durationMinutes: number
  customerName: string
  customerPhone: string
  note?: string
}

export async function createAdminAppointment(
  input: AdminCreateAppointmentInput,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const admin    = createAdminClient()

  if (!input.customerName.trim()) return { error: 'Name is required.' }

  const appointmentId = randomUUID()
  const cancelToken   = randomUUID()

  // Convert Brussels wall-clock time to real UTC
  const naiveUtc = new Date(`${input.date}T${input.time}:00Z`)
  const brusselsString = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Brussels',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).format(naiveUtc)
  const brusselsAsUtc = new Date(brusselsString.replace(' ', 'T') + 'Z')
  const offsetMs  = brusselsAsUtc.getTime() - naiveUtc.getTime()
  const startTime = new Date(naiveUtc.getTime() - offsetMs)
  const endTime   = new Date(startTime.getTime() + input.durationMinutes * 60_000)

  const { error } = await supabase.from('appointments').insert({
    id:             appointmentId,
    barber_id:      input.barberId,
    service_id:     input.serviceId,
    customer_name:  input.customerName.trim(),
    customer_phone: input.customerPhone.trim(),
    start_time:     startTime.toISOString(),
    end_time:       endTime.toISOString(),
    status:         'confirmed',
    source:         'website',
    cancel_token:   cancelToken,
    notes:          input.note?.trim() || null,
  })

  if (error) {
    if (error.code === '23P01') return { error: 'slot_taken' }
    return { error: error.message }
  }

  const [{ data: barber }, { data: service }] = await Promise.all([
    admin.from('barbers').select('name, google_calendar_id, whatsapp_number').eq('id', input.barberId).single(),
    admin.from('services').select('name_en').eq('id', input.serviceId).single(),
  ])

  const serviceName = service?.name_en ?? 'Afspraak'

  // Google Calendar
  if (barber?.google_calendar_id) {
    const calEventId = await createCalendarEvent({
      calendarId: barber.google_calendar_id,
      summary:    `${serviceName} — ${input.customerName.trim()}`,
      appointmentId,
      startTime,
      endTime,
    })
    if (calEventId) {
      await admin.from('appointments').update({ google_calendar_event_id: calEventId }).eq('id', appointmentId)
    }
  }

  // Outstanding fees (needed for both barber and customer messages)
  const { data: openFees } = await admin
    .from('late_cancellation_fees')
    .select('amount_owed')
    .eq('customer_phone', input.customerPhone.trim())
    .is('paid_at', null)
  const totalOwed = (openFees ?? []).reduce((sum, f) => sum + Number(f.amount_owed), 0)

  // WhatsApp barber notification
  if (barber?.whatsapp_number) {
    let msg = barberNotificationMessage({
      customerName:  input.customerName.trim(),
      serviceName,
      date:          input.date,
      time:          input.time,
      customerPhone: input.customerPhone.trim(),
    })
    if (totalOwed > 0) {
      msg += `\n\n⚠️ Let op: deze klant heeft nog een openstaande schuld van €${totalOwed.toFixed(2)} van een eerdere te-late annulering.`
    }
    await sendWhatsApp(barber.whatsapp_number, msg)
  }

  // WhatsApp customer confirmation
  const customerPhone = input.customerPhone.trim()
  if (customerPhone.startsWith('+')) {
    const siteUrl   = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://kobbarbershop.be'
    const cancelUrl = `${siteUrl}/nl/cancel/${cancelToken}`
    let customerMsg = customerConfirmationMessage({
      customerName: input.customerName.trim(),
      serviceName,
      barberName:   barber?.name ?? 'uw barber',
      date:         input.date,
      time:         input.time,
      cancelUrl,
    })
    if (totalOwed > 0) {
      customerMsg += `\n\n⚠️ Opgelet: je hebt nog een openstaande schuld van €${totalOwed.toFixed(2)} van een eerdere te late annulering. Gelieve dit bedrag mee te brengen en te betalen bij aanvang van je afspraak.`
    }
    await sendWhatsApp(customerPhone, customerMsg)
  }

  revalidatePath('/admin/appointments')
  return {}
}
