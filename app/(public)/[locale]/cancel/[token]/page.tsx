import { setRequestLocale, getTranslations } from 'next-intl/server'
import { createAdminClient } from '@/lib/supabase/admin'
import CancelClient, { type AppointmentPreview } from './CancelClient'

type Props = { params: Promise<{ locale: string; token: string }> }

export async function generateMetadata({ params }: Props) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'cancel' })
  return { title: `${t('pageTitle')} — K.O.B. Barbershop` }
}

const LATE_THRESHOLD_MS = 90 * 60 * 1000

export default async function CancelPage({ params }: Props) {
  const { locale, token } = await params
  setRequestLocale(locale)

  const admin = createAdminClient()
  const { data: appt } = await admin
    .from('appointments')
    .select(`
      status, start_time, customer_name,
      barbers ( name ),
      services ( name_en, price )
    `)
    .eq('cancel_token', token)
    .single()

  let preview: AppointmentPreview

  if (!appt) {
    preview = {
      customerName: '', serviceName: '', barberName: '',
      dateLabel: '', timeLabel: '', price: 0,
      isLate: false, alreadyCancelled: false, alreadyPast: false, invalidToken: true,
    }
  } else {
    const startTime = new Date(appt.start_time)
    const now       = new Date()
    const barber    = Array.isArray(appt.barbers)  ? appt.barbers[0]  : appt.barbers  as { name: string } | null
    const service   = Array.isArray(appt.services) ? appt.services[0] : appt.services as { name_en: string; price: number } | null

    const dateLabel = new Intl.DateTimeFormat(locale, {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      timeZone: 'Europe/Brussels',
    }).format(startTime)

    const timeLabel = new Intl.DateTimeFormat('nl-BE', {
      hour: '2-digit', minute: '2-digit', hour12: false,
      timeZone: 'Europe/Brussels',
    }).format(startTime)

    const msUntilStart = startTime.getTime() - now.getTime()

    preview = {
      customerName:     appt.customer_name,
      serviceName:      service?.name_en ?? '',
      barberName:       barber?.name ?? '',
      dateLabel,
      timeLabel,
      price:            Number(service?.price ?? 0),
      isLate:           startTime > now && msUntilStart < LATE_THRESHOLD_MS,
      alreadyCancelled: appt.status === 'cancelled',
      alreadyPast:      startTime <= now && appt.status !== 'cancelled',
      invalidToken:     false,
    }
  }

  return <CancelClient token={token} preview={preview} />
}
