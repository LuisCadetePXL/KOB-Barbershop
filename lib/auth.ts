import { createClient } from '@/lib/supabase/server'

// Authorization guard for server actions that use the service-role admin client.
// The admin client bypasses RLS, so those actions MUST verify the caller is staff
// themselves — the middleware alone is not a sufficient auth boundary for
// server actions (they are callable public HTTP endpoints).
//
// Throws 'unauthorized' if not logged in, 'forbidden' if logged in but not staff.
// Returns the authenticated staff user on success.
export async function requireStaff() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('unauthorized')

  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!data || !['admin', 'developer'].includes(data.role)) {
    throw new Error('forbidden')
  }

  return user
}
