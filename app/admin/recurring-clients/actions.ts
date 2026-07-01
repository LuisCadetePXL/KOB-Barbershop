'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { deleteCalendarEvent } from '@/lib/google-calendar'
import { generateAppointmentsForClient, type PatternType } from '@/lib/recurring-appointments'

export async function addRecurringClient(_: unknown, formData: FormData) {
  const supabase = await createClient()
  const admin    = createAdminClient()

  const barberId    = formData.get('barber_id') as string
  const serviceId   = formData.get('service_id') as string
  const name        = (formData.get('customer_name') as string).trim()
  const phone       = (formData.get('customer_phone') as string).trim()
  const startTime   = formData.get('start_time') as string
  const pattern     = formData.get('pattern_type') as PatternType
  const dayOfWeek   = parseInt(formData.get('day_of_week') as string)
  const weekOfMonth = formData.get('week_of_month') ? parseInt(formData.get('week_of_month') as string) : null
  const notes       = (formData.get('notes') as string | null)?.trim() || null

  if (!barberId)  return { error: 'Barber is required.' }
  if (!name)      return { error: 'Customer name is required.' }
  if (!startTime) return { error: 'Start time is required.' }
  if (!pattern)   return { error: 'Pattern is required.' }
  if (isNaN(dayOfWeek)) return { error: 'Day of week is required.' }
  if (pattern === 'monthly' && weekOfMonth === null) return { error: 'Week of month is required for monthly pattern.' }

  const { data: client, error: insertError } = await supabase
    .from('recurring_clients')
    .insert({
      barber_id:    barberId,
      service_id:   serviceId || null,
      customer_name: name,
      customer_phone: phone,
      start_time:   startTime,
      pattern_type: pattern,
      day_of_week:  dayOfWeek,
      week_of_month: pattern === 'monthly' ? weekOfMonth : null,
      notes,
    })
    .select(`
      id, barber_id, customer_name, customer_phone,
      service_id, start_time, pattern_type, day_of_week, week_of_month,
      barbers ( name, google_calendar_id, whatsapp_number ),
      services ( name_en, duration_minutes )
    `)
    .single()

  if (insertError) return { error: insertError.message }

  console.log('[KOB Recurring] client inserted:', client?.id)
  console.log('[KOB Recurring] client.service_id:', client?.service_id)
  console.log('[KOB Recurring] client.services:', JSON.stringify(client?.services))
  console.log('[KOB Recurring] client.barbers:', JSON.stringify(client?.barbers))

  // Generate appointments for the next 3 months immediately
  const result = await generateAppointmentsForClient(client as any, admin)
  console.log('[KOB Recurring] generate result:', JSON.stringify(result))

  revalidatePath('/admin/recurring-clients')
  revalidatePath('/admin/appointments')
  return {}
}

export async function deactivateRecurringClient(id: string): Promise<{ error?: string }> {
  const admin = createAdminClient()

  // Load the recurring client (need barber for calendar deletion)
  const { data: client } = await admin
    .from('recurring_clients')
    .select('barber_id, barbers(google_calendar_id)')
    .eq('id', id)
    .single()

  const calendarId = (client?.barbers as any)?.google_calendar_id ?? null

  // Find all future confirmed appointments for this client
  const { data: futureAppts } = await admin
    .from('appointments')
    .select('id, google_calendar_event_id')
    .eq('recurring_client_id', id)
    .eq('status', 'confirmed')
    .gt('start_time', new Date().toISOString())

  // Delete calendar events + cancel appointments
  for (const appt of futureAppts ?? []) {
    if (calendarId && appt.google_calendar_event_id) {
      await deleteCalendarEvent(calendarId, appt.google_calendar_event_id)
    }
  }

  if ((futureAppts ?? []).length > 0) {
    await admin
      .from('appointments')
      .update({ status: 'cancelled' })
      .eq('recurring_client_id', id)
      .eq('status', 'confirmed')
      .gt('start_time', new Date().toISOString())
  }

  const { error } = await admin
    .from('recurring_clients')
    .update({ active: false })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/admin/recurring-clients')
  revalidatePath('/admin/appointments')
  return {}
}
