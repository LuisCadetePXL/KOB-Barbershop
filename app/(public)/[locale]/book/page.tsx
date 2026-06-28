import { getTranslations, setRequestLocale } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import BookingClient from './BookingClient'
import type { Barber, Service } from '@/types/database'

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ service?: string; barber?: string }>
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'book' })
  return { title: `${t('pageTitle')} — King of Barber` }
}

type BookingService = Pick<Service, 'id' | 'name_en' | 'description_en' | 'price' | 'duration_minutes'>
type BookingBarber  = Pick<Barber,  'id' | 'name' | 'photo_url' | 'is_owner'>

export default async function BookPage({ params, searchParams }: Props) {
  const [{ locale }, { service: serviceId, barber: barberId }] = await Promise.all([
    params,
    searchParams,
  ])
  setRequestLocale(locale)

  const supabase = await createClient()

  const [{ data: services }, { data: barbers }] = await Promise.all([
    supabase
      .from('services')
      .select('id, name_en, description_en, price, duration_minutes')
      .order('name_en'),
    supabase
      .from('barbers')
      .select('id, name, photo_url, is_owner')
      .eq('active', true)
      .order('is_owner', { ascending: false })
      .order('name'),
  ])

  const today = new Date().toISOString().split('T')[0]

  const allServices = (services ?? []) as BookingService[]
  const allBarbers  = (barbers  ?? []) as BookingBarber[]

  const initialService = serviceId ? allServices.find((s) => s.id === serviceId) ?? null : null
  const initialBarber  = barberId  ? allBarbers.find((b)  => b.id === barberId)  ?? null : null

  return (
    <BookingClient
      services={allServices}
      barbers={allBarbers}
      locale={locale}
      today={today}
      initialService={initialService}
      initialBarber={initialBarber}
    />
  )
}
