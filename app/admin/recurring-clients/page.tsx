import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import RecurringClientsClient from './RecurringClientsClient'

export default async function RecurringClientsPage() {
  const supabase = await createClient()
  const admin    = createAdminClient()

  const [
    { data: clients },
    { data: barbers },
    { data: services },
    { data: futureCounts },
  ] = await Promise.all([
    admin
      .from('recurring_clients')
      .select('id, barber_id, customer_name, customer_phone, service_id, start_time, pattern_type, day_of_week, week_of_month, active, notes, barbers(name), services(name_en)')
      .order('customer_name'),
    supabase
      .from('barbers')
      .select('id, name')
      .eq('active', true)
      .order('name'),
    supabase
      .from('services')
      .select('id, name_en, duration_minutes')
      .order('name_en'),
    admin
      .from('appointments')
      .select('recurring_client_id')
      .eq('status', 'confirmed')
      .gt('start_time', new Date().toISOString())
      .not('recurring_client_id', 'is', null),
  ])

  // Count future appointments per recurring_client_id
  const countMap: Record<string, number> = {}
  for (const row of futureCounts ?? []) {
    if (row.recurring_client_id) {
      countMap[row.recurring_client_id] = (countMap[row.recurring_client_id] ?? 0) + 1
    }
  }

  return (
    <RecurringClientsClient
      clients={(clients as any) ?? []}
      barbers={barbers ?? []}
      services={services ?? []}
      futureCountMap={countMap}
    />
  )
}
