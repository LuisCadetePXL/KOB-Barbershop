import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'

export default function Footer() {
  const t = useTranslations('nav')
  const tf = useTranslations('footer')
  const year = new Date().getFullYear()

  const navLinks = [
    { href: '/' as const,        label: t('home') },
    { href: '/about' as const,   label: t('about') },
    { href: '/team' as const,    label: t('team') },
    { href: '/prices' as const,  label: t('prices') },
    { href: '/contact' as const, label: t('contact') },
  ]

  return (
    <footer className="border-t border-kob-border bg-kob-dark">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-3">

          {/* Brand */}
          <div>
            <p className="font-display text-lg font-bold tracking-widest uppercase text-kob-white">
              King of <span className="text-kob-red">Barber</span>
            </p>
            <p className="mt-2 text-sm text-kob-muted">{tf('tagline')}</p>
            <a
              href="https://www.instagram.com/king_of_barber_belgium"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 text-sm text-kob-muted hover:text-kob-white transition-colors"
            >
              <InstagramIcon />
              @king_of_barber_belgium
            </a>
          </div>

          {/* Nav */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-kob-muted mb-4">
              {tf('navigation')}
            </p>
            <ul className="flex flex-col gap-2">
              {navLinks.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm text-kob-muted hover:text-kob-white transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Address */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-kob-muted mb-4">
              {tf('visitUs')}
            </p>
            <address className="not-italic flex flex-col gap-1 text-sm text-kob-muted">
              <span>Maarschalk Fochstraat 5</span>
              <span>3970 Leopoldsburg</span>
            </address>
          </div>
        </div>

        <div className="mt-10 border-t border-kob-border pt-6 text-xs text-kob-muted">
          © {year} King of Barber. {tf('copyright')}
        </div>
      </div>
    </footer>
  )
}

function InstagramIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
    </svg>
  )
}
