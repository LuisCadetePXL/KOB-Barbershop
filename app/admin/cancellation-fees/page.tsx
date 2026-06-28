import { createAdminClient } from '@/lib/supabase/admin'
import CancellationFeesClient from './CancellationFeesClient'

export type FeeRow = {
  id: string
  customer_name: string
  customer_phone: string
  amount_owed: number
  paid_at: string | null
  created_at: string
  appointments: {
    start_time: string
    barbers: { name: string } | null
    services: { name_en: string } | null
  } | null
}

export default async function CancellationFeesPage() {
  const admin = createAdminClient()

  const { data: fees } = await admin
    .from('late_cancellation_fees')
    .select(`
      id, customer_name, customer_phone, amount_owed, paid_at, created_at,
      appointments (
        start_time,
        barbers ( name ),
        services ( name_en )
      )
    `)
    .order('created_at', { ascending: false })

  return <CancellationFeesClient fees={(fees ?? []) as unknown as FeeRow[]} />
}
