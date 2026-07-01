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
                  <>
                    <ContactRow label={t('phone')}>
                      <a
                        href={`tel:${settings.phone.replace(/\s/g, '')}`}
                        className="text-sm text-kob-muted hover:text-kob-white transition-colors"
                      >
                        {settings.phone}
                      </a>
                    </ContactRow>
                    <ContactRow label="WhatsApp">
                      <a
                        href={`https://wa.me/${settings.phone.replace(/[\s+\-]/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-green-400 hover:text-green-300 transition-colors"
                      >
                        <WhatsAppIcon />
                        {t('whatsapp')}
                      </a>
                    </ContactRow>
                  </>
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
              {/* Dark map via CSS invert — no API key needed for the basic embed */}
              <div className="mt-6 overflow-hidden border border-kob-border">
                <iframe
                  src="https://maps.google.com/maps?q=Maarschalk+Fochstraat+5,+3970+Leopoldsburg,+Belgium&output=embed&hl=nl&z=16"
                  className="w-full aspect-video block"
                  style={{ opacity: 0.95 }}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="KOB Barbershop locatie"
                />
              </div>
              <a
                href="https://maps.google.com/?q=Maarschalk+Fochstraat+5,+3970+Leopoldsburg,+Belgium"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-kob-red hover:text-kob-white transition-colors"
              >
                {t('mapLink')} →
              </a>
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

function WhatsAppIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

function PageHeader({ title }: { title: string }) {
  return (
    <div className="border-b border-kob-border bg-kob-dark py-14 text-center">
      <h1 className="font-display text-4xl font-bold text-kob-white sm:text-5xl">{title}</h1>
    </div>
  )
}
