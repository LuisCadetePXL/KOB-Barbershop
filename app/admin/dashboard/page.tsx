import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Supabase infers embedded to-one relations (e.g. barbers(name), services(name_en))
// as arrays when the client has no typed schema. Normalize to a single related row.
function one<T>(rel: T | T[] | null | undefined): T | null {
  if (!rel) return null
  return Array.isArray(rel) ? (rel[0] ?? null) : rel
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const admin    = createAdminClient()

  // Brussels date helpers
  const now = new Date()
  const todayStr = now.toLocaleDateString('en-CA', { timeZone: 'Europe/Brussels' }) // "YYYY-MM-DD"
  const dayOfWeek = new Date(`${todayStr}T12:00:00Z`).getDay() // 0=Sun
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const mondayDate = new Date(`${todayStr}T00:00:00+02:00`)
  mondayDate.setDate(mondayDate.getDate() + mondayOffset)
  const sundayDate = new Date(mondayDate)
  sundayDate.setDate(mondayDate.getDate() + 7)

  const todayStart    = `${todayStr}T00:00:00+02:00`
  const tomorrowStart = (() => {
    const d = new Date(`${todayStr}T00:00:00+02:00`)
    d.setDate(d.getDate() + 1)
    return d.toISOString()
  })()

  const [
    { data: todayAppts },
    { count: weekCount },
    { count: openFeesCount },
    { count: recurringCount },
    { data: nextApptArr },
  ] = await Promise.all([
    supabase
      .from('appointments')
      .select('id, customer_name, start_time, end_time, barbers(name), services(name_en)')
      .eq('status', 'confirmed')
      .gte('start_time', todayStart)
      .lt('start_time', tomorrowStart)
      .order('start_time'),
    supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'confirmed')
      .gte('start_time', mondayDate.toISOString())
      .lt('start_time', sundayDate.toISOString()),
    admin
      .from('late_cancellation_fees')
      .select('*', { count: 'exact', head: true })
      .is('paid_at', null),
    admin
      .from('recurring_clients')
      .select('*', { count: 'exact', head: true })
      .eq('active', true),
    supabase
      .from('appointments')
      .select('id, customer_name, start_time, barbers(name), services(name_en)')
      .eq('status', 'confirmed')
      .gt('start_time', now.toISOString())
      .order('start_time')
      .limit(1),
  ])

  // Group today's appointments by barber
  const byBarber = new Map<string, typeof todayAppts>()
  for (const appt of todayAppts ?? []) {
    const barberName = one<{ name: string }>(appt.barbers)?.name ?? 'Unknown'
    if (!byBarber.has(barberName)) byBarber.set(barberName, [])
    byBarber.get(barberName)!.push(appt)
  }

  const nextAppt = nextApptArr?.[0] ?? null
  const nextBarber  = one<{ name: string }>(nextAppt?.barbers)?.name
  const nextService = one<{ name_en: string }>(nextAppt?.services)?.name_en

  const nextTime = nextAppt
    ? new Intl.DateTimeFormat('en-GB', {
        weekday: 'short', day: 'numeric', month: 'short',
        hour: '2-digit', minute: '2-digit',
        timeZone: 'Europe/Brussels',
      }).format(new Date(nextAppt.start_time))
    : null

  return (
    <div className="max-w-4xl">
      <h1 className="font-display text-2xl font-bold text-kob-white">Dashboard</h1>
      <p className="mt-1 text-sm text-kob-muted">King of Barber — admin overview.</p>

      {/* Stats row */}
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Today"
          value={todayAppts?.length ?? 0}
          note={todayAppts?.length === 1 ? 'appointment' : 'appointments'}
        />
        <StatCard
          label="This week"
          value={weekCount ?? 0}
          note="appointments"
        />
        <StatCard
          label="Open fees"
          value={openFeesCount ?? 0}
          note="cancellations"
          alert={(openFeesCount ?? 0) > 0}
        />
        <StatCard
          label="Recurring clients"
          value={recurringCount ?? 0}
          note="active"
        />
      </div>

      {/* Next appointment */}
      {nextAppt ? (
        <div className="mt-8">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-kob-muted mb-3">
            Next appointment
          </h2>
          <div className="rounded-lg border border-kob-border bg-kob-dark px-5 py-4">
            <div className="flex flex-wrap items-baseline gap-3">
              <span className="font-display text-lg font-semibold text-kob-white">
                {nextAppt.customer_name}
              </span>
              {nextService && (
                <span className="text-sm text-kob-muted">{nextService}</span>
              )}
              {nextBarber && (
                <span className="rounded-full border border-kob-border px-2 py-0.5 text-xs text-kob-muted">
                  {nextBarber}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-kob-red font-medium">{nextTime}</p>
          </div>
        </div>
      ) : (
        <div className="mt-8">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-kob-muted mb-3">
            Next appointment
          </h2>
          <p className="text-sm text-kob-muted">No upcoming appointments.</p>
        </div>
      )}

      {/* Today's schedule per barber */}
      <div className="mt-8">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-kob-muted mb-3">
          Today's schedule
        </h2>

        {byBarber.size === 0 ? (
          <p className="text-sm text-kob-muted">No appointments today.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {Array.from(byBarber.entries()).map(([barberName, appts]) => (
              <div key={barberName} className="rounded-lg border border-kob-border bg-kob-dark overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 border-b border-kob-border bg-kob-surface">
                  <span className="text-xs font-semibold uppercase tracking-widest text-kob-muted">
                    {barberName}
                  </span>
                  <span className="text-xs text-kob-muted">
                    {appts!.length} {appts!.length === 1 ? 'appt' : 'appts'}
                  </span>
                </div>
                <div className="divide-y divide-kob-border">
                  {appts!.map((appt) => {
                    const time = new Intl.DateTimeFormat('en-GB', {
                      hour: '2-digit', minute: '2-digit',
                      timeZone: 'Europe/Brussels',
                    }).format(new Date(appt.start_time))
                    const svc = one<{ name_en: string }>(appt.services)?.name_en
                    return (
                      <div key={appt.id} className="flex items-center gap-4 px-4 py-2.5">
                        <span className="text-sm font-medium text-kob-red w-12 shrink-0">{time}</span>
                        <span className="text-sm text-kob-white">{appt.customer_name}</span>
                        {svc && <span className="text-xs text-kob-muted">{svc}</span>}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  note,
  alert = false,
}: {
  label: string
  value: number
  note?: string
  alert?: boolean
}) {
  return (
    <div className={`rounded-lg border p-5 ${alert ? 'border-amber-700 bg-amber-900/10' : 'border-kob-border bg-kob-dark'}`}>
      <p className="text-xs font-semibold uppercase tracking-widest text-kob-muted">{label}</p>
      <p className={`mt-2 font-display text-3xl font-bold ${alert ? 'text-amber-400' : 'text-kob-white'}`}>{value}</p>
      {note && <p className="mt-1 text-xs text-kob-border">{note}</p>}
    </div>
  )
}
