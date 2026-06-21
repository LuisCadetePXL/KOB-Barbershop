import { createClient } from '@/lib/supabase/server'
import ClosedDatesClient from './ClosedDatesClient'

export default async function ClosedDatesPage() {
  const supabase = await createClient()

  const [{ data: closedDates }, { data: barbers }] = await Promise.all([
    supabase
      .from('closed_dates')
      .select('*, barbers(name)')
      .order('date', { ascending: true }),
    supabase
      .from('barbers')
      .select('*')
      .eq('active', true)
      .order('name'),
  ])

  return (
    <ClosedDatesClient
      closedDates={(closedDates as any) ?? []}
      barbers={barbers ?? []}
    />
  )
}
