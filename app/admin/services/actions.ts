'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function addService(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const name_en = (formData.get('name_en') as string)?.trim()
  const price = parseFloat(formData.get('price') as string)
  const duration_minutes = parseInt(formData.get('duration_minutes') as string, 10)
  const description_en = (formData.get('description_en') as string)?.trim() || null
  const description_nl = (formData.get('description_nl') as string)?.trim() || null
  const description_es = (formData.get('description_es') as string)?.trim() || null

  if (!name_en) return { error: 'Name is required.' }
  if (isNaN(price) || price <= 0) return { error: 'Price must be greater than 0.' }
  if (isNaN(duration_minutes) || duration_minutes <= 0) return { error: 'Duration must be greater than 0.' }

  const { error } = await supabase.from('services').insert({
    name_en,
    description_en,
    description_nl,
    description_es,
    price,
    duration_minutes,
  })

  if (error) return { error: error.message }
  revalidatePath('/admin/services')
  revalidatePath('/', 'layout')
  return {}
}

export async function updateService(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const id = formData.get('id') as string
  const name_en = (formData.get('name_en') as string)?.trim()
  const price = parseFloat(formData.get('price') as string)
  const duration_minutes = parseInt(formData.get('duration_minutes') as string, 10)
  const description_en = (formData.get('description_en') as string)?.trim() || null
  const description_nl = (formData.get('description_nl') as string)?.trim() || null
  const description_es = (formData.get('description_es') as string)?.trim() || null

  if (!name_en) return { error: 'Name is required.' }
  if (isNaN(price) || price <= 0) return { error: 'Price must be greater than 0.' }
  if (isNaN(duration_minutes) || duration_minutes <= 0) return { error: 'Duration must be greater than 0.' }

  const { error } = await supabase
    .from('services')
    .update({ name_en, description_en, description_nl, description_es, price, duration_minutes })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/admin/services')
  revalidatePath('/', 'layout')
  return {}
}

export async function deleteService(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('services').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/services')
  return {}
}
