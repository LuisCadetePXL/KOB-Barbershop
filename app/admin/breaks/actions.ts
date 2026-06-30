'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function addBreak(_: unknown, formData: FormData) {
  const supabase = await createClient()

  const barberId   = formData.get('barber_id') as string
  const recurring  = formData.get('recurring') === 'true'
  const dayOfWeek  = formData.get('day_of_week') as string
  const date       = formData.get('date') as string
  const startTime  = formData.get('start_time') as string
  const endTime    = formData.get('end_time') as string
  const label      = (formData.get('label') as string).trim()

  if (!startTime || !endTime) return { error: 'Start and end time are required.' }
  if (startTime >= endTime) return { error: 'End time must be after start time.' }
  if (recurring && !dayOfWeek) return { error: 'Day of week is required for recurring breaks.' }
  if (!recurring && !date) return { error: 'Date is required for one-time breaks.' }

  const { error } = await supabase.from('barber_breaks').insert({
    barber_id:   barberId || null,
    recurring,
    day_of_week: recurring ? parseInt(dayOfWeek) : null,
    date:        recurring ? null : date,
    start_time:  startTime,
    end_time:    endTime,
    label:       label || (recurring ? 'Break' : 'Break'),
  })

  if (error) return { error: error.message }

  revalidatePath('/admin/breaks')
  return {}
}

export async function deleteBreak(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('barber_breaks').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/breaks')
  return {}
}
