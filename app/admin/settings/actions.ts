'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { requireStaff } from '@/lib/auth'

// Validate a user-supplied social URL. Empty is allowed (returns null). A non-empty
// value must be a parseable https:// URL, otherwise it is rejected — these values
// are rendered as <a href> in the footer, so a javascript: URL would be XSS.
function validateHttpsUrl(
  value: string | null,
  label: string,
): { url: string | null; error?: string } {
  if (!value) return { url: null }
  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    return { url: null, error: `${label} is not a valid URL.` }
  }
  if (parsed.protocol !== 'https:') {
    return { url: null, error: `${label} must start with https://` }
  }
  return { url: value }
}

export async function updateBusinessSettings(formData: FormData) {
  await requireStaff()

  const phone   = (formData.get('phone')   as string).trim() || null
  const address = (formData.get('address') as string).trim() || null

  const instagram = validateHttpsUrl((formData.get('instagram_url') as string).trim() || null, 'Instagram URL')
  const facebook  = validateHttpsUrl((formData.get('facebook_url')  as string).trim() || null, 'Facebook URL')
  const tiktok    = validateHttpsUrl((formData.get('tiktok_url')    as string).trim() || null, 'TikTok URL')

  const urlError = instagram.error ?? facebook.error ?? tiktok.error
  if (urlError) return { error: urlError }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('business_settings')
    .update({
      phone,
      address,
      instagram_url: instagram.url,
      facebook_url:  facebook.url,
      tiktok_url:    tiktok.url,
    })
    .eq('id', 1)

  if (error) return { error: error.message }

  revalidatePath('/admin/settings')
  revalidatePath('/', 'layout')

  return { error: null }
}
