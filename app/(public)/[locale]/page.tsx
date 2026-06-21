import { useTranslations } from 'next-intl'
import { setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'

type Props = { params: Promise<{ locale: string }> }

export default async function HomePage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  return <HomeContent />
}

// Separate component so useTranslations works (called from RSC context)
function HomeContent() {
  const t = useTranslations('home')
  const tNav = useTranslations('nav')

  return (
    <>
      {/* Hero */}
      <section className="relative flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center overflow-hidden bg-kob-black px-4 text-center">
        <CrownDecoration />

        <div className="relative z-10 flex flex-col items-center gap-6">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-kob-red">
            {t('location')}
          </p>
          <h1 className="font-display text-5xl font-bold leading-tight text-kob-white sm:text-7xl lg:text-8xl">
            {t('heading1')}
            <br />
            <span className="text-kob-red">{t('heading2')}</span>
          </h1>
          <p className="max-w-md text-base text-kob-muted sm:text-lg">
            {t('subtitle')}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/prices"
              className="rounded-none bg-kob-red px-8 py-3.5 text-sm font-semibold uppercase tracking-widest text-kob-white transition-colors hover:bg-kob-red-dark"
            >
              {t('ctaBook')}
            </Link>
            <Link
              href="/about"
              className="rounded-none border border-kob-border px-8 py-3.5 text-sm font-semibold uppercase tracking-widest text-kob-muted transition-colors hover:border-kob-white hover:text-kob-white"
            >
              {t('ctaStory')}
            </Link>
          </div>
        </div>

        <div className="absolute bottom-8 flex flex-col items-center gap-2 text-kob-muted">
          <span className="text-xs uppercase tracking-widest">{t('scroll')}</span>
          <div className="h-8 w-px bg-kob-border" />
        </div>
      </section>

      {/* Teaser cards */}
      <section className="bg-kob-dark py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid grid-cols-1 gap-px bg-kob-border sm:grid-cols-3">
            <TeaserCard
              title={t('teaserTeam.title')}
              body={t('teaserTeam.body')}
              href="/team"
              cta={t('teaserTeam.cta')}
            />
            <TeaserCard
              title={t('teaserPrices.title')}
              body={t('teaserPrices.body')}
              href="/prices"
              cta={t('teaserPrices.cta')}
            />
            <TeaserCard
              title={t('teaserContact.title')}
              body={t('teaserContact.body')}
              href="/contact"
              cta={t('teaserContact.cta')}
            />
          </div>
        </div>
      </section>
    </>
  )
}

function TeaserCard({
  title,
  body,
  href,
  cta,
}: {
  title: string
  body: string
  href: string
  cta: string
}) {
  return (
    <div className="group bg-kob-dark p-8 transition-colors hover:bg-kob-surface">
      <h2 className="font-display text-xl font-semibold text-kob-white">{title}</h2>
      <p className="mt-3 text-sm leading-relaxed text-kob-muted">{body}</p>
      <Link
        href={href as '/team' | '/prices' | '/contact'}
        className="mt-6 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-kob-red transition-colors group-hover:text-kob-white"
      >
        {cta}
        <span aria-hidden>→</span>
      </Link>
    </div>
  )
}

function CrownDecoration() {
  return (
    <svg
      viewBox="0 0 200 160"
      aria-hidden="true"
      className="absolute inset-0 m-auto h-full w-full max-h-[80vh] opacity-[0.04] select-none pointer-events-none"
      fill="currentColor"
    >
      <path d="M10 130 L30 50 L70 90 L100 20 L130 90 L170 50 L190 130 Z" />
      <rect x="10" y="130" width="180" height="20" rx="2" />
      <circle cx="100" cy="20" r="8" />
      <circle cx="30" cy="50" r="6" />
      <circle cx="170" cy="50" r="6" />
    </svg>
  )
}
