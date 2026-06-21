import { createClient } from '@/lib/supabase/server'
import AppointmentsClient from './AppointmentsClient'

export type AppointmentRow = {
  id: string
  status: 'confirmed' | 'cancelled'
  source: 'website' | 'external'
  start_time: string
  end_time: string
  customer_name: string
  customer_phone: string
  google_calendar_event_id: string | null
  created_at: string
  barbers: { name: string } | null
  services: { name_en: string } | null
}

export default async function AppointmentsPage() {
  const supabase = await createClient()

  const { data: appointments } = await supabase
    .from('appointments')
    .select('id, status, source, start_time, end_time, customer_name, customer_phone, google_calendar_event_id, created_at, barbers(name), services(name_en)')
    .order('start_time', { ascending: true })
    .limit(200)

  return <AppointmentsClient appointments={(appointments ?? []) as unknown as AppointmentRow[]} />
}
