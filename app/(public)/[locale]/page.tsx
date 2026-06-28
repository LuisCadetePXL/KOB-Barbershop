import { useTranslations } from 'next-intl'
import { setRequestLocale, getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { getGoogleReviews, type PlaceReview } from '@/lib/google-reviews'

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
      {/* Hero — wood texture background */}
      <section
        className="relative flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center overflow-hidden bg-kob-black px-4 text-center"
        style={{
          backgroundImage: "url('/images/wood-bg.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        {/* Dark overlay so text stays readable */}
        <div className="absolute inset-0 bg-black/70" aria-hidden />

        {/* Vignette — darkens edges for depth */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.6) 100%)' }}
          aria-hidden
        />

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
              href="/book"
              className="rounded-none bg-kob-red px-8 py-3.5 text-sm font-semibold uppercase tracking-widest text-kob-white transition-colors hover:bg-kob-red-dark"
            >
              {t('ctaBook')}
            </Link>
            <Link
              href="/about"
              className="rounded-none border border-white/30 px-8 py-3.5 text-sm font-semibold uppercase tracking-widest text-kob-white/80 transition-colors hover:border-kob-white hover:text-kob-white"
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

      {/* Google Reviews — async, falls back to null if API unavailable */}
      <ReviewsSection />
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

const GOOGLE_REVIEWS_URL = 'https://www.google.com/maps/place/?q=place_id:ChIJ0SaBgEwxwUcRnlbIUVNWILo'

async function ReviewsSection() {
  const [t, data] = await Promise.all([
    getTranslations('reviews'),
    getGoogleReviews(),
  ])

  if (!data || data.reviews.length === 0) return null

  return (
    <section className="bg-gray-50 py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">

        {/* Section header */}
        <div className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.4em] text-kob-red">Google</p>
            <h2 className="font-display text-3xl font-bold text-gray-900">{t('heading')}</h2>
          </div>

          <div className="flex items-center gap-5">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold tabular-nums text-gray-900">
                  {data.rating.toFixed(1)}
                </span>
                <span className="text-sm text-gray-400">/ 5</span>
              </div>
              <Stars rating={data.rating} large />
              <p className="mt-1 text-xs text-gray-500">
                {data.user_ratings_total} {t('totalReviews')}
              </p>
            </div>

            <div className="h-14 w-px bg-gray-200" />

            <a
              href={GOOGLE_REVIEWS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="max-w-[9rem] text-xs font-semibold uppercase leading-relaxed tracking-widest text-kob-red transition-colors hover:text-gray-900"
            >
              {t('allReviews')} →
            </a>
          </div>
        </div>

        {/* Review cards — 1 col → 2 col → 3 col */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.reviews.map((review, i) => (
            <ReviewCard key={i} review={review} />
          ))}
        </div>

      </div>
    </section>
  )
}

function Stars({ rating, large = false }: { rating: number; large?: boolean }) {
  const full  = Math.floor(rating)
  const half  = rating - full >= 0.5 ? 1 : 0
  const empty = 5 - full - half
  const cls   = large ? 'text-xl' : 'text-base'
  return (
    <span className={`${cls} leading-none text-kob-red`} aria-label={`${rating} / 5`}>
      {'★'.repeat(full)}
      {half ? '½' : ''}
      {'☆'.repeat(empty)}
    </span>
  )
}

function ReviewCard({ review }: { review: PlaceReview }) {
  const initial = review.author_name.charAt(0).toUpperCase()
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">

      {/* Stars */}
      <Stars rating={review.rating} />

      {/* Review text — full, no truncation */}
      {review.text && (
        <p className="text-sm leading-relaxed text-gray-700 line-clamp-5">{review.text}</p>
      )}

      {/* Reviewer */}
      <div className="mt-auto flex items-center gap-3 border-t border-gray-100 pt-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600">
          {initial}
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-gray-900">{review.author_name}</p>
          <p className="text-xs text-gray-400">{review.relative_time_description}</p>
        </div>
      </div>
    </div>
  )
}
