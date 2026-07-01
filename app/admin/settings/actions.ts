'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { requireStaff } from '@/lib/auth'

export async function updateBusinessSettings(formData: FormData) {
  await requireStaff()

  const phone         = (formData.get('phone')         as string).trim() || null
  const address       = (formData.get('address')       as string).trim() || null
  const instagram_url = (formData.get('instagram_url') as string).trim() || null
  const facebook_url  = (formData.get('facebook_url')  as string).trim() || null
  const tiktok_url    = (formData.get('tiktok_url')    as string).trim() || null

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('business_settings')
    .update({ phone, address, instagram_url, facebook_url, tiktok_url })
    .eq('id', 1)

  if (error) return { error: error.message }

  revalidatePath('/admin/settings')
  revalidatePath('/', 'layout')

  return { error: null }
}
