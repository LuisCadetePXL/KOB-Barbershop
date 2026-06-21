import { createClient } from '@/lib/supabase/server'
import BarbersClient from './BarbersClient'

export default async function BarbersPage() {
  const supabase = await createClient()
  const { data: barbers } = await supabase
    .from('barbers')
    .select('*')
    .order('is_owner', { ascending: false })
    .order('name')

  return <BarbersClient barbers={barbers ?? []} />
}
