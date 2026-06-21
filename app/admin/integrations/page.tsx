import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import IntegrationsClient from './IntegrationsClient'

export default async function IntegrationsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'developer') redirect('/admin')

  const { data: barbers } = await supabase
    .from('barbers')
    .select('id, name, google_calendar_id')
    .order('is_owner', { ascending: false })
    .order('name')

  return <IntegrationsClient barbers={barbers ?? []} />
}
