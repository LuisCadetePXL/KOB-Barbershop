import { createAdminClient } from '@/lib/supabase/admin'
import SettingsClient from './SettingsClient'
import type { BusinessSettings } from '@/types/database'

export default async function SettingsPage() {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('business_settings')
    .select('phone, address, instagram_url, facebook_url, tiktok_url')
    .single<Pick<BusinessSettings, 'phone' | 'address' | 'instagram_url' | 'facebook_url' | 'tiktok_url'>>()

  return <SettingsClient settings={data} />
}
