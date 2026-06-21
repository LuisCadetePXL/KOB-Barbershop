'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

async function uploadAvatar(supabase: Awaited<ReturnType<typeof createClient>>, id: string, photo: File): Promise<string | null> {
  // Delete existing first to avoid relying on the upsert UPDATE policy path
  await supabase.storage.from('avatars').remove([`${id}.png`])

  const bytes = await photo.arrayBuffer()
  const { error } = await supabase.storage
    .from('avatars')
    .upload(`${id}.png`, bytes, {
      contentType: photo.type || 'image/png',
      // max-age=1 prevents CDN from caching — ensures the new file is served
      // immediately after upload without needing cache-busting query params
      cacheControl: '1',
    })

  if (error) return null

  const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(`${id}.png`)
  // Append timestamp so the browser always treats each upload as a new URL,
  // bypassing its own cache even when the storage path stays the same
  return `${publicUrl}?t=${Date.now()}`
}

export async function addBarber(
  _prev: { error?: string; id?: string } | null,
  formData: FormData,
): Promise<{ error?: string; id?: string }> {
  const supabase = await createClient()
  const name = (formData.get('name') as string)?.trim()
  const is_owner = formData.get('is_owner') === 'true'
  if (!name) return { error: 'Name is required.' }

  const { data, error } = await supabase
    .from('barbers')
    .insert({ name, is_owner })
    .select('id')
    .single()

  if (error) return { error: error.message }

  const photo = formData.get('photo') as File | null
  if (photo && photo.size > 0) {
    const publicUrl = await uploadAvatar(supabase, data.id, photo)
    if (!publicUrl) return { error: 'Barber added, but photo upload failed. You can retry via Edit.' }
    await supabase.from('barbers').update({ photo_url: publicUrl }).eq('id', data.id)
  }

  revalidatePath('/admin/barbers')
  revalidatePath('/', 'layout')
  return { id: data.id }
}

export async function updateBarber(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const id = formData.get('id') as string
  const name = (formData.get('name') as string)?.trim()
  const active = formData.get('active') === 'true'
  const is_owner = formData.get('is_owner') === 'true'
  const removePhoto = formData.get('removePhoto') === 'true'

  if (!name) return { error: 'Name is required.' }

  const updates: Record<string, unknown> = { name, active, is_owner }

  if (removePhoto) {
    await supabase.storage.from('avatars').remove([`${id}.png`])
    updates.photo_url = null
  } else {
    const photo = formData.get('photo') as File | null
    if (photo && photo.size > 0) {
      const publicUrl = await uploadAvatar(supabase, id, photo)
      if (!publicUrl) return { error: 'Photo upload failed. Name and status were saved.' }
      updates.photo_url = publicUrl
    }
  }

  const { error } = await supabase.from('barbers').update(updates).eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/admin/barbers')
  revalidatePath('/', 'layout')
  return {}
}

export async function deleteBarber(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  await supabase.storage.from('avatars').remove([`${id}.png`])
  const { error } = await supabase.from('barbers').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/barbers')
  return {}
}
