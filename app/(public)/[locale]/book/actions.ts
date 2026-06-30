'use server'

import { randomUUID } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createCalendarEvent } from '@/lib/google-calendar'
import {
  sendWhatsApp,
  barberNotificationMessage,
  customerConfirmationMessage,
} from '@/lib/twilio'

export interface SlotResult {
  slots: string[]
  closed: boolean
}

export async function getAvailableSlots(
  barberId: string,
  date: string,
  durationMinutes: number,
): Promise<SlotResult> {
  const supabase = await createClient()

  const { data: closedRows } = await supabase
    .from('closed_dates')
    .select('id')
    .eq('date', date)
    .or(`barber_id.is.null,barber_id.eq.${barberId}`)
    .limit(1)

  if (closedRows && closedRows.length > 0) {
    return { slots: [], closed: true }
  }

  const dayOfWeek = new Date(date + 'T12:00:00Z').getDay()
  const { data: hours } = await supabase
    .from('opening_hours')
    .select('closed')
    .eq('day_of_week', dayOfWeek)
    .single()

  if (!hours || hours.closed) {
    return { slots: [], closed: true }
  }

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
  date: string
  time: string
  durationMinutes: number
  customerName: string
  customerPhone: string
}

export interface CreateAppointmentResult {
  error?: string
  cancelToken?: string
}

export async function createAppointment(
  input: CreateAppointmentInput,
): Promise<CreateAppointmentResult> {
  const supabase = await createClient()

  if (!input.customerName.trim()) return { error: 'Name is required.' }
  const strippedPhone = input.customerPhone.replace(/[\s\-\.\(\)]/g, '')
  if (!/^\+?[0-9]{9,15}$/.test(strippedPhone)) {
    return { error: 'Phone number is invalid. Please use an international format, e.g. +32 476 00 00 00.' }
  }

  const appointmentId = randomUUID()
  const cancelToken   = randomUUID()

  const naiveUtc = new Date(`${input.date}T${input.time}:00Z`)
  const brusselsString = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Brussels',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).format(naiveUtc)
  const brusselsAsUtc = new Date(brusselsString.replace(' ', 'T') + 'Z')
  const offsetMs = brusselsAsUtc.getTime() - naiveUtc.getTime()
  const startTime = new Date(naiveUtc.getTime() - offsetMs)
  const endTime   = new Date(startTime.getTime() + input.durationMinutes * 60_000)

  const { error } = await supabase
    .from('appointments')
    .insert({
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
    })

  if (error) {
    if (error.code === '23P01') return { error: 'slot_taken' }
    return { error: error.message }
  }

  const admin = createAdminClient()
  const [{ data: barber }, { data: service }] = await Promise.all([
    admin.from('barbers').select('name, google_calendar_id, whatsapp_number').eq('id', input.barberId).single(),
    admin.from('services').select('name_en').eq('id', input.serviceId).single(),
  ])

  const serviceName = service?.name_en ?? 'Afspraak'
  const barberName  = barber?.name ?? 'Kapper'

  if (barber?.google_calendar_id) {
    const calEventId = await createCalendarEvent({
      calendarId: barber.google_calendar_id,
      summary:    `${serviceName} — ${input.customerName.trim()}`,
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

  // Check if this customer has outstanding late cancellation fees
  const { data: outstandingFees } = await admin
    .from('late_cancellation_fees')
    .select('amount_owed')
    .eq('customer_phone', input.customerPhone.trim())
    .is('paid_at', null)

  const totalOwed = outstandingFees?.reduce((sum, f) => sum + Number(f.amount_owed), 0) ?? 0

  if (barber?.whatsapp_number) {
    let barberMsg = barberNotificationMessage({
      customerName:  input.customerName.trim(),
      serviceName,
      date:          input.date,
      time:          input.time,
      customerPhone: input.customerPhone.trim(),
    })
    if (totalOwed > 0) {
      barberMsg += `\n\n⚠️ Let op: deze klant heeft nog een openstaande schuld van €${totalOwed.toFixed(2)} van een eerdere te-late annulering.`
    }
    await sendWhatsApp(barber.whatsapp_number, barberMsg)
  }

  const customerPhone = input.customerPhone.trim()
  const siteUrl       = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://kobbarbershop.be'
  const cancelUrl     = `${siteUrl}/nl/cancel/${cancelToken}`

  if (customerPhone.startsWith('+')) {
    let customerMsg = customerConfirmationMessage({
      customerName: input.customerName.trim(),
      serviceName,
      barberName,
      date:      input.date,
      time:      input.time,
      cancelUrl,
    })
    if (totalOwed > 0) {
      customerMsg += `\n\n⚠️ Opgelet: je hebt nog een openstaande schuld van €${totalOwed.toFixed(2)} van een eerdere te late annulering. Gelieve dit bedrag mee te brengen en te betalen bij aanvang van je afspraak.`
    }
    await sendWhatsApp(customerPhone, customerMsg)
  }

  return { cancelToken }
}
