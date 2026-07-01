import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function Footer() {
  const t  = useTranslations('nav')
  const tf = useTranslations('footer')
  const year = new Date().getFullYear()

  const supabase = await createClient()
  const { data: settings } = await supabase
    .from('business_settings')
    .select('instagram_url, facebook_url, tiktok_url')
    .single()

  const instagramUrl = settings?.instagram_url || null
  const facebookUrl  = settings?.facebook_url  || null
  const tiktokUrl    = settings?.tiktok_url    || null

  const navLinks = [
    { href: '/' as const,        label: t('home') },
    { href: '/about' as const,   label: t('about') },
    { href: '/team' as const,    label: t('team') },
    { href: '/prices' as const,  label: t('prices') },
    { href: '/contact' as const, label: t('contact') },
  ]

  return (
    <footer className="relative border-t border-kob-border bg-kob-dark">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-3">

          {/* Brand + socials */}
          <div>
            <p className="font-display text-lg font-bold tracking-widest uppercase text-kob-white">
              K.O.B. <span className="text-kob-red">Barbershop</span>
            </p>
            <p className="mt-2 text-sm text-kob-muted">{tf('tagline')}</p>

            <div className="mt-5 flex items-center gap-4">
              {instagramUrl && (
                <SocialLink href={instagramUrl} label="Instagram">
                  <InstagramIcon />
                </SocialLink>
              )}
              {facebookUrl && (
                <SocialLink href={facebookUrl} label="Facebook">
                  <FacebookIcon />
                </SocialLink>
              )}
              {tiktokUrl && (
                <SocialLink href={tiktokUrl} label="TikTok">
                  <TikTokIcon />
                </SocialLink>
              )}
            </div>
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
          © {year} K.O.B. Belgium. {tf('copyright')}
        </div>
      </div>
    </footer>
  )
}

function SocialLink({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="text-kob-muted hover:text-kob-white transition-colors"
    >
      {children}
    </a>
  )
}

function InstagramIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
    </svg>
  )
}

function FacebookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  )
}

function TikTokIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.32 6.32 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.73a4.85 4.85 0 0 1-1.01-.04z" />
    </svg>
  )
}
