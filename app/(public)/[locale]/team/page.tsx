import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import type { Barber } from '@/types/database'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'team' })
  return { title: `${t('pageTitle')} — King of Barber` }
}

export default async function TeamPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  const supabase = await createClient()
  const { data: barbers } = await supabase
    .from('barbers')
    .select('id, name, photo_url, active, is_owner')
    .eq('active', true)
    .order('is_owner', { ascending: false })
    .order('name')

  return <TeamContent barbers={barbers} />
}

type BarberRow = Pick<Barber, 'id' | 'name' | 'photo_url' | 'active' | 'is_owner'>

function TeamContent({ barbers }: { barbers: BarberRow[] | null }) {
  const t = useTranslations('team')

  return (
    <>
      <PageHeader title={t('pageTitle')} />

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        {barbers && barbers.length > 0 ? (
          <>
            <p className="text-center text-kob-muted max-w-md mx-auto mb-14">
              {t('intro')}
            </p>
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {barbers.map((barber) => (
                <BarberCard key={barber.id} barber={barber} role={t('role')} />
              ))}
            </div>
          </>
        ) : (
          <p className="text-center text-kob-muted">{t('empty')}</p>
        )}
      </section>
    </>
  )
}

function BarberCard({ barber, role }: { barber: BarberRow; role: string }) {
  return (
    <div className="group flex flex-col bg-kob-dark border border-kob-border overflow-hidden">
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-kob-surface">
        {barber.photo_url ? (
          <Image
            src={barber.photo_url}
            alt={barber.name}
            fill
            className="object-cover object-top transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <BarberInitials name={barber.name} />
        )}
      </div>
      <div className="p-5 border-t border-kob-border">
        <h2 className="font-display text-lg font-semibold text-kob-white">{barber.name}</h2>
        <p className="mt-1 text-xs uppercase tracking-widest text-kob-red">{role}</p>
      </div>
    </div>
  )
}

function BarberInitials({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <span className="font-display text-6xl font-bold text-kob-border select-none">
        {initials}
      </span>
    </div>
  )
}

function PageHeader({ title }: { title: string }) {
  return (
    <div className="border-b border-kob-border bg-kob-dark py-14 text-center">
      <h1 className="font-display text-4xl font-bold text-kob-white sm:text-5xl">{title}</h1>
    </div>
  )
}
