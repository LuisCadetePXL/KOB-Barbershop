'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function addBreak(_: unknown, formData: FormData) {
  const supabase = await createClient()

  const barberId  = formData.get('barber_id') as string
  const recurring = formData.get('recurring') === 'true'
  const date      = formData.get('date') as string
  const startTime = formData.get('start_time') as string
  const endTime   = formData.get('end_time') as string
  const label     = (formData.get('label') as string).trim() || 'Break'

  if (!startTime || !endTime) return { error: 'Start and end time are required.' }
  if (startTime >= endTime)   return { error: 'End time must be after start time.' }
  if (!recurring && !date)    return { error: 'Date is required for one-time breaks.' }

  if (recurring) {
    const days = formData.getAll('day_of_week').map(Number)
    if (days.length === 0) return { error: 'Select at least one day.' }

    const rows = days.map((dow) => ({
      barber_id:   barberId || null,
      recurring:   true,
      day_of_week: dow,
      date:        null,
      start_time:  startTime,
      end_time:    endTime,
      label,
    }))

    const { error } = await supabase.from('barber_breaks').insert(rows)
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase.from('barber_breaks').insert({
      barber_id:   barberId || null,
      recurring:   false,
      day_of_week: null,
      date,
      start_time:  startTime,
      end_time:    endTime,
      label,
    })
    if (error) return { error: error.message }
  }

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
