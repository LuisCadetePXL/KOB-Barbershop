import { createClient } from '@/lib/supabase/server'
import AppointmentsClient from './AppointmentsClient'
import { createAdminClient } from '@/lib/supabase/admin'
import type { UserRole } from '@/types/database'

export type AppointmentRow = {
  id: string
  status: 'confirmed' | 'cancelled' | 'archived'
  source: 'website' | 'external' | 'recurring'
  start_time: string
  end_time: string
  customer_name: string
  customer_phone: string
  google_calendar_event_id: string | null
  created_at: string
  barbers: { name: string } | null
  services: { name_en: string } | null
  hasDebt?: boolean
}

export type BarberOption  = { id: string; name: string }
export type ServiceOption = { id: string; name_en: string; duration_minutes: number }

export default async function AppointmentsPage() {
  const supabase = await createClient()
  const admin    = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile }  = user
    ? await supabase.from('profiles').select('role').eq('id', user.id).single()
    : { data: null }
  const isDeveloper = (profile?.role as UserRole | undefined) === 'developer'

  const [
    { data: appointments },
    { data: openFees },
    { data: barbers },
    { data: services },
  ] = await Promise.all([
    supabase
      .from('appointments')
      .select('id, status, source, start_time, end_time, customer_name, customer_phone, google_calendar_event_id, created_at, barbers(name), services(name_en)')
      .order('start_time', { ascending: true })
      .limit(200),
    admin
      .from('late_cancellation_fees')
      .select('customer_phone')
      .is('paid_at', null),
    supabase
      .from('barbers')
      .select('id, name')
      .eq('active', true)
      .order('name'),
    supabase
      .from('services')
      .select('id, name_en, duration_minutes')
      .order('name_en'),
  ])

  const debtPhones = new Set((openFees ?? []).map((f) => f.customer_phone))
  const enriched = (appointments ?? []).map((a) => ({
    ...a,
    hasDebt: debtPhones.has(a.customer_phone),
  }))

  return (
    <AppointmentsClient
      appointments={enriched as unknown as AppointmentRow[]}
      barbers={(barbers ?? []) as BarberOption[]}
      services={(services ?? []) as ServiceOption[]}
      isDeveloper={isDeveloper}
    />
  )
}
