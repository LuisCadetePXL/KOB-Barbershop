'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function markFeePaid(feeId: string): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('late_cancellation_fees')
    .update({ paid_at: new Date().toISOString(), marked_paid_by: user.id })
    .eq('id', feeId)

  if (error) return { error: error.message }

  revalidatePath('/admin/cancellation-fees')
  return { error: null }
}
