'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function updateBarberCalendarId(
  barberId: string,
  calendarId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('barbers')
    .update({ google_calendar_id: calendarId.trim() || null })
    .eq('id', barberId)

  if (error) return { error: error.message }

  revalidatePath('/admin/integrations')
  return {}
}
