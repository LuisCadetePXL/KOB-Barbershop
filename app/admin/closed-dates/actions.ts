'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function addClosedDate(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const date = formData.get('date') as string
  const barber_id = (formData.get('barber_id') as string) || null
  const reason = (formData.get('reason') as string)?.trim() || null

  if (!date) return { error: 'Date is required.' }

  // Server-side duplicate check:
  // Block if an "entire shop" entry already exists for this date,
  // OR if an exact (date, barber_id) match already exists.
  const { data: existing } = await supabase
    .from('closed_dates')
    .select('id, barber_id')
    .eq('date', date)

  if (existing && existing.length > 0) {
    const shopClosed = existing.some((r) => r.barber_id === null)
    const exactMatch = existing.some((r) => r.barber_id === barber_id)

    if (shopClosed) {
      return { error: 'The entire shop is already marked as closed on this date.' }
    }
    if (exactMatch) {
      return { error: barber_id === null
        ? 'The entire shop is already marked as closed on this date.'
        : 'This barber is already marked as unavailable on this date.' }
    }
  }

  const { error } = await supabase.from('closed_dates').insert({
    date,
    barber_id,
    reason,
  })

  if (error) return { error: error.message }
  revalidatePath('/admin/closed-dates')
  return {}
}

export async function deleteClosedDate(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('closed_dates').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/closed-dates')
  return {}
}
