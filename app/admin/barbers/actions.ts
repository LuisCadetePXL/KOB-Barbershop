'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

const MAX_AVATAR_BYTES = 5 * 1024 * 1024 // 5 MB
const ALLOWED_AVATAR_TYPES = ['image/png', 'image/jpeg', 'image/webp']

async function uploadAvatar(
  supabase: Awaited<ReturnType<typeof createClient>>,
  id: string,
  photo: File,
): Promise<{ url?: string; error?: string }> {
  // Validate before touching storage. The client `accept` attribute is cosmetic
  // and bypassable, so type/size must be enforced server-side.
  if (!ALLOWED_AVATAR_TYPES.includes(photo.type)) {
    return { error: 'Invalid image type. Use PNG, JPEG or WebP.' }
  }
  if (photo.size > MAX_AVATAR_BYTES) {
    return { error: 'Image too large. Maximum size is 5 MB.' }
  }

  // Delete existing first to avoid relying on the upsert UPDATE policy path
  await supabase.storage.from('avatars').remove([`${id}.png`])

  const bytes = await photo.arrayBuffer()
  const { error } = await supabase.storage
    .from('avatars')
    .upload(`${id}.png`, bytes, {
      contentType: photo.type, // validated against ALLOWED_AVATAR_TYPES above
      // max-age=1 prevents CDN from caching — ensures the new file is served
      // immediately after upload without needing cache-busting query params
      cacheControl: '1',
    })

  if (error) return { error: 'Photo upload failed.' }

  const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(`${id}.png`)
  // Append timestamp so the browser always treats each upload as a new URL,
  // bypassing its own cache even when the storage path stays the same
  return { url: `${publicUrl}?t=${Date.now()}` }
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
    const uploaded = await uploadAvatar(supabase, data.id, photo)
    if (uploaded.error) return { error: `Barber added, but the photo was rejected: ${uploaded.error} You can retry via Edit.` }
    await supabase.from('barbers').update({ photo_url: uploaded.url }).eq('id', data.id)
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
      const uploaded = await uploadAvatar(supabase, id, photo)
      if (uploaded.error) return { error: uploaded.error }
      updates.photo_url = uploaded.url
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
