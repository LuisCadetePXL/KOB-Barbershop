import { createClient } from '@/lib/supabase/server'
import AdminSidebar from '@/components/admin/AdminSidebar'
import type { UserRole } from '@/types/database'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // No user → render children only (the login page); middleware already
  // redirected any other /admin/* path to /admin/login before we got here.
  if (!user) return <>{children}</>

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role: UserRole = (profile?.role as UserRole) ?? 'admin'

  return (
    <div className="flex min-h-screen bg-kob-black">
      <AdminSidebar role={role} email={user.email ?? ''} />

      <div className="flex flex-1 flex-col">
        {/* Top bar (mobile) */}
        <header className="md:hidden flex items-center justify-between border-b border-kob-border bg-kob-dark px-4 py-3">
          <p className="font-display text-sm font-bold tracking-widest uppercase text-kob-white">
            KOB <span className="text-kob-red">Admin</span>
          </p>
          <span className="text-xs text-kob-muted">{user.email}</span>
        </header>

        <main className="flex-1 p-6 md:p-8">{children}</main>
      </div>
    </div>
  )
}
