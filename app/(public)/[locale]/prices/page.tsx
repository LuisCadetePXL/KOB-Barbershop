import { useTranslations } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Service } from '@/types/database'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'prices' })
  return { title: `${t('pageTitle')} — King of Barber` }
}

export default async function PricesPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  const supabase = await createClient()
  const { data: services } = await supabase
    .from('services')
    .select('id, name_en, description_en, description_nl, description_es, price, duration_minutes')
    .order('name_en')

  return <PricesContent services={services} locale={locale} />
}

type ServiceRow = Pick<
  Service,
  'id' | 'name_en' | 'description_en' | 'description_nl' | 'description_es' | 'price' | 'duration_minutes'
>

function PricesContent({ services, locale }: { services: ServiceRow[] | null; locale: string }) {
  const t = useTranslations('prices')

  return (
    <>
      <PageHeader title={t('pageTitle')} />

      <section className="mx-auto max-w-4xl px-4 py-20 sm:px-6">
        {services && services.length > 0 ? (
          <div className="flex flex-col divide-y divide-kob-border border border-kob-border">
            {services.map((service) => (
              <ServiceRow
                key={service.id}
                service={service}
                locale={locale}
                minutesLabel={t('minutes')}
                bookCta={t('bookCta')}
              />
            ))}
          </div>
        ) : (
          <p className="text-center text-kob-muted">{t('empty')}</p>
        )}
      </section>
    </>
  )
}

function ServiceRow({
  service,
  locale,
  minutesLabel,
  bookCta,
}: {
  service: ServiceRow
  locale: string
  minutesLabel: string
  bookCta: string
}) {
  const description =
    (locale === 'nl' && service.description_nl) ||
    (locale === 'es' && service.description_es) ||
    service.description_en

  return (
    <div className="flex flex-col gap-3 bg-kob-dark px-6 py-5 transition-colors hover:bg-kob-surface sm:flex-row sm:items-center sm:justify-between sm:gap-8">
      <div className="flex-1">
        <h2 className="font-display text-lg font-semibold text-kob-white">{service.name_en}</h2>
        {description && (
          <p className="mt-1 text-sm leading-relaxed text-kob-muted">{description}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-4">
        <span className="text-xs text-kob-muted whitespace-nowrap">
          {service.duration_minutes} {minutesLabel}
        </span>
        <span className="font-display text-xl font-bold text-kob-red">
          €{Number(service.price).toFixed(2)}
        </span>
        <Link
          href={`/book?service=${service.id}` as '/book'}
          className="bg-kob-red px-4 py-2 text-xs font-semibold uppercase tracking-widest text-kob-white transition-colors hover:bg-kob-red-dark"
        >
          {bookCta}
        </Link>
      </div>
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
