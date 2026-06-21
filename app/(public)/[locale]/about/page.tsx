import { useTranslations } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'about' })
  return { title: `${t('pageTitle')} — King of Barber` }
}

export default async function AboutPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  return <AboutContent />
}

function AboutContent() {
  const t = useTranslations('about')

  return (
    <>
      <PageHeader title={t('pageTitle')} />

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-20 items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-kob-red mb-4">
              {t('sectionLabel')}
            </p>
            <h2 className="font-display text-3xl font-bold text-kob-white sm:text-4xl">
              {t('heading')}
            </h2>
            <p className="mt-6 leading-relaxed text-kob-muted">{t('text')}</p>
          </div>

          <div className="relative aspect-[4/5] w-full overflow-hidden bg-kob-surface border border-kob-border">
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <ScissorsIcon />
              <span className="text-xs uppercase tracking-widest text-kob-border">
                {t('photoPlaceholder')}
              </span>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

function PageHeader({ title }: { title: string }) {
  return (
    <div className="border-b border-kob-border bg-kob-dark py-14 text-center">
      <h1 className="font-display text-4xl font-bold text-kob-white sm:text-5xl">{title}</h1>
    </div>
  )
}

function ScissorsIcon() {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-kob-border"
      aria-hidden="true"
    >
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <line x1="20" y1="4" x2="8.12" y2="15.88" />
      <line x1="14.47" y1="14.48" x2="20" y2="20" />
      <line x1="8.12" y1="8.12" x2="12" y2="12" />
    </svg>
  )
}
