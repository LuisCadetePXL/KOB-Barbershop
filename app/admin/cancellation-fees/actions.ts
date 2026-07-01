'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { requireStaff } from '@/lib/auth'

export async function markFeePaid(feeId: string): Promise<{ error: string | null }> {
  const user = await requireStaff()

  const admin = createAdminClient()
  const { error } = await admin
    .from('late_cancellation_fees')
    .update({ paid_at: new Date().toISOString(), marked_paid_by: user.id })
    .eq('id', feeId)

  if (error) return { error: error.message }

  revalidatePath('/admin/cancellation-fees')
  return { error: null }
}
