import { createClient } from '@/lib/supabase/server'
import ServicesClient from './ServicesClient'

export default async function ServicesPage() {
  const supabase = await createClient()
  const { data: services } = await supabase
    .from('services')
    .select('*')
    .order('name_en')

  return <ServicesClient services={services ?? []} />
}
