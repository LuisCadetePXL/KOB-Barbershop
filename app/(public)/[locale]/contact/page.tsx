import { useTranslations } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import type { BusinessSettings, OpeningHours } from '@/types/database'

type Props = { params: Promise<{ locale: string }> }

// Maps day_of_week (0=Sun) to translation key
const DAY_KEY_MAP = [
  'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday',
] as const

function formatTime(t: string): string {
  const [h, m] = t.split(':')
  return `${h}:${m}`
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'contact' })
  return { title: `${t('pageTitle')} — King of Barber` }
}

export default async function ContactPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  const supabase = await createClient()

  const [{ data: settings }, { data: hours }] = await Promise.all([
    supabase
      .from('business_settings')
      .select('phone, address, instagram_url')
      .single<Pick<BusinessSettings, 'phone' | 'address' | 'instagram_url'>>(),

    supabase
      .from('opening_hours')
      .select('day_of_week, opens_at, closes_at, closed')
      .order('day_of_week'),
  ])

  // Belgian display order: Monday first
  const sortedHours = hours?.slice().sort(
    (a, b) => ((a.day_of_week + 6) % 7) - ((b.day_of_week + 6) % 7),
  )

  return <ContactContent settings={settings} hours={sortedHours ?? null} />
}

type SettingsRow = Pick<BusinessSettings, 'phone' | 'address' | 'instagram_url'>
type HourRow = Pick<OpeningHours, 'day_of_week' | 'opens_at' | 'closes_at' | 'closed'>

function ContactContent({
  settings,
  hours,
}: {
  settings: SettingsRow | null
  hours: HourRow[] | null
}) {
  const t = useTranslations('contact')

  return (
    <>
      <PageHeader title={t('pageTitle')} />

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">

          {/* Opening hours */}
          <div>
            <SectionLabel>{t('openingHours')}</SectionLabel>
            <div className="mt-6 flex flex-col divide-y divide-kob-border border border-kob-border">
              {hours?.map((row) => (
                <div
                  key={row.day_of_week}
                  className="flex items-center justify-between bg-kob-dark px-5 py-3"
                >
                  <span className="text-sm text-kob-white">
                    {t(`days.${DAY_KEY_MAP[row.day_of_week]}`)}
                  </span>
                  {row.closed ? (
                    <span className="text-sm text-kob-muted">{t('closed')}</span>
                  ) : (
                    <span className="text-sm text-kob-muted">
                      {row.opens_at ? formatTime(row.opens_at) : '—'}
                      {' – '}
                      {row.closes_at ? formatTime(row.closes_at) : '—'}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-kob-muted">{t('hoursDisclaimer')}</p>
          </div>

          {/* Contact info + map */}
          <div className="flex flex-col gap-10">
            <div>
              <SectionLabel>{t('contactInfo')}</SectionLabel>
              <dl className="mt-6 flex flex-col gap-4">
                <ContactRow label={t('address')}>
                  <address className="not-italic text-sm text-kob-muted">
                    {settings?.address ?? 'Maarschalk Fochstraat 5, 3970 Leopoldsburg'}
                  </address>
                </ContactRow>
                {settings?.phone && (
                  <ContactRow label={t('phone')}>
                    <a
                      href={`tel:${settings.phone.replace(/\s/g, '')}`}
                      className="text-sm text-kob-muted hover:text-kob-white transition-colors"
                    >
                      {settings.phone}
                    </a>
                  </ContactRow>
                )}
                {settings?.instagram_url && (
                  <ContactRow label={t('instagram')}>
                    <a
                      href={settings.instagram_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-kob-muted hover:text-kob-white transition-colors"
                    >
                      @king_of_barber_belgium
                    </a>
                  </ContactRow>
                )}
              </dl>
            </div>

            <div>
              <SectionLabel>{t('location')}</SectionLabel>
              <div className="mt-6 aspect-video w-full bg-kob-surface border border-kob-border flex items-center justify-center">
                <p className="text-xs text-kob-muted text-center px-4">
                  {t('mapPlaceholder')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-kob-red">{children}</p>
  )
}

function ContactRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <dt className="w-20 shrink-0 text-xs font-semibold uppercase tracking-wider text-kob-muted pt-0.5">
        {label}
      </dt>
      <dd>{children}</dd>
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
