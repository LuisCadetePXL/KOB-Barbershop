import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { count: appointmentCount } = await supabase
    .from('appointments')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'confirmed')

  const { count: barberCount } = await supabase
    .from('barbers')
    .select('*', { count: 'exact', head: true })
    .eq('active', true)

  return (
    <div className="max-w-4xl">
      <h1 className="font-display text-2xl font-bold text-kob-white">Dashboard</h1>
      <p className="mt-1 text-sm text-kob-muted">Welcome back to King of Barber admin.</p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Confirmed appointments" value={appointmentCount ?? 0} />
        <StatCard label="Active barbers" value={barberCount ?? 0} />
        <StatCard label="Today's bookings" value="—" note="Coming in phase 7" />
      </div>

      <div className="mt-10">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-kob-muted mb-4">
          What's next
        </h2>
        <div className="border border-kob-border bg-kob-dark rounded p-5 text-sm text-kob-muted leading-relaxed">
          Phase 5 will add full CRUD for barbers, services, opening hours,
          closed dates and about text. Phase 7 adds the booking flow with
          live appointment management here.
        </div>
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  note,
}: {
  label: string
  value: number | string
  note?: string
}) {
  return (
    <div className="border border-kob-border bg-kob-dark p-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-kob-muted">{label}</p>
      <p className="mt-2 font-display text-3xl font-bold text-kob-white">{value}</p>
      {note && <p className="mt-1 text-xs text-kob-border">{note}</p>}
    </div>
  )
}
