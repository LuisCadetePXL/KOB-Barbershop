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

export async function updateBarberWhatsAppNumber(
  barberId: string,
  number: string,
): Promise<{ error?: string }> {
  const supabase = await createClient()

  const trimmed = number.trim() || null

  // Basic format check: must start with + and contain only digits after that
  if (trimmed && !/^\+[0-9]{7,15}$/.test(trimmed)) {
    return { error: 'Ongeldig formaat. Gebruik internationaal formaat: +32476000000' }
  }

  const { error } = await supabase
    .from('barbers')
    .update({ whatsapp_number: trimmed })
    .eq('id', barberId)

  if (error) return { error: error.message }

  revalidatePath('/admin/integrations')
  return {}
}
