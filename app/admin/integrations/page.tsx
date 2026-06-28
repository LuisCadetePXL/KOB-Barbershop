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

  const isDeveloper = profile?.role === 'developer'

  const { data: barbers } = await supabase
    .from('barbers')
    .select('id, name, google_calendar_id, whatsapp_number')
    .order('is_owner', { ascending: false })
    .order('name')

  return <IntegrationsClient barbers={barbers ?? []} isDeveloper={isDeveloper} />
}
