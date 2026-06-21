import { createClient } from '@/lib/supabase/server'
import OpeningHoursClient from './OpeningHoursClient'

export default async function OpeningHoursPage() {
  const supabase = await createClient()
  const { data: hours } = await supabase.from('opening_hours').select('*')

  return <OpeningHoursClient hours={hours ?? []} />
}
