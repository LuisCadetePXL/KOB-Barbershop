import { createClient } from '@/lib/supabase/server'
import BreaksClient from './BreaksClient'

export default async function BreaksPage() {
  const supabase = await createClient()

  const [{ data: breaks }, { data: barbers }] = await Promise.all([
    supabase
      .from('barber_breaks')
      .select('*, barbers(name)')
      .order('recurring', { ascending: false })
      .order('day_of_week', { ascending: true, nullsFirst: false })
      .order('date', { ascending: true, nullsFirst: false })
      .order('start_time'),
    supabase
      .from('barbers')
      .select('id, name')
      .eq('active', true)
      .order('name'),
  ])

  return <BreaksClient breaks={(breaks as any) ?? []} barbers={barbers ?? []} />
}
