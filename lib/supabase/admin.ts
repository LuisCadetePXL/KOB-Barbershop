import { createClient } from '@supabase/supabase-js'

// Service-role client — bypasses RLS entirely.
// Only use in trusted server-side code (server actions, API routes, cron jobs).
// Never expose to the browser or use in client components.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}
