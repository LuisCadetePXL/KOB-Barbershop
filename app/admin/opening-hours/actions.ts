'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

// Called with one row at a time (day_of_week 0–6)
export async function updateOpeningHour(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const day_of_week = parseInt(formData.get('day_of_week') as string, 10)
  const closed = formData.get('closed') === 'true'
  const opens_at = (formData.get('opens_at') as string) || null
  const closes_at = (formData.get('closes_at') as string) || null

  if (!closed && (!opens_at || !closes_at)) {
    return { error: 'Opening and closing time are required when the day is open.' }
  }

  const { error } = await supabase
    .from('opening_hours')
    .update({
      closed,
      opens_at: closed ? null : opens_at,
      closes_at: closed ? null : closes_at,
    })
    .eq('day_of_week', day_of_week)

  if (error) return { error: error.message }
  revalidatePath('/admin/opening-hours')
  return {}
}
