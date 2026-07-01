// GET /api/cron/generate-recurring
// Generates recurring appointments for the next 3 months for all active recurring clients.
// Recommended schedule: weekly (e.g. every Monday at 06:00 Brussels time).
//
// Required headers:
//   x-cron-secret: <CRON_SECRET>

import { createAdminClient } from '@/lib/supabase/admin'
import { generateAppointmentsForClient } from '@/lib/recurring-appointments'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const cronSecret = request.headers.get('x-cron-secret')
  if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  const { data: clients, error } = await admin
    .from('recurring_clients')
    .select(`
      id, barber_id, customer_name, customer_phone,
      service_id, start_time, pattern_type, day_of_week, week_of_month,
      barbers ( name, google_calendar_id, whatsapp_number ),
      services ( name_en, duration_minutes )
    `)
    .eq('active', true)

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  let totalCreated   = 0
  let totalSkipped   = 0
  let totalConflicts = 0
  const errors: string[] = []

  for (const client of clients ?? []) {
    try {
      const result = await generateAppointmentsForClient(client as any, admin)
      totalCreated   += result.created
      totalSkipped   += result.skipped
      totalConflicts += result.conflicts
    } catch (err) {
      errors.push(`Client ${client.id} (${client.customer_name}): ${String(err)}`)
    }
  }

  return Response.json({
    ok:        errors.length === 0,
    clients:   (clients ?? []).length,
    created:   totalCreated,
    skipped:   totalSkipped,
    conflicts: totalConflicts,
    errors:    errors.length ? errors : undefined,
  })
}
