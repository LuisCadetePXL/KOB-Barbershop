'use client'

import { useLocale } from 'next-intl'
import { usePathname, useRouter } from '@/i18n/navigation'
import { routing, type Locale } from '@/i18n/routing'

const LOCALE_LABELS: Record<Locale, string> = {
  nl: 'NL',
  en: 'EN',
  es: 'ES',
}

export default function LanguageSwitcher() {
  const locale = useLocale() as Locale
  const pathname = usePathname()
  const router = useRouter()

  function switchLocale(next: Locale) {
    if (next === locale) return
    router.replace(pathname, { locale: next })
  }

  return (
    <div className="flex items-center gap-1" aria-label="Language switcher">
      {routing.locales.map((loc, i) => (
        <span key={loc} className="flex items-center gap-1">
          {i > 0 && <span className="text-kob-border text-xs select-none">·</span>}
          <button
            onClick={() => switchLocale(loc)}
            aria-current={loc === locale ? 'true' : undefined}
            className={`text-xs font-semibold uppercase tracking-widest transition-colors ${
              loc === locale
                ? 'text-kob-red cursor-default'
                : 'text-kob-muted hover:text-kob-white'
            }`}
          >
            {LOCALE_LABELS[loc]}
          </button>
        </span>
      ))}
    </div>
  )
}
