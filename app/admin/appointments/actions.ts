'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { deleteCalendarEvent } from '@/lib/google-calendar'

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
