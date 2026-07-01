import type { MetadataRoute } from 'next'
import { routing } from '@/i18n/routing'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://kobbarbershop.be'

// Public, indexable routes (relative to /[locale]). The cancel route is
// token-based and intentionally excluded.
const PUBLIC_PATHS = ['', 'about', 'team', 'prices', 'contact', 'book'] as const

function url(locale: string, path: string): string {
  return `${BASE_URL}/${locale}${path ? `/${path}` : ''}`
}

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  return PUBLIC_PATHS.flatMap((path) => {
    // hreflang alternates: every locale variant of this path, plus x-default.
    const languages: Record<string, string> = Object.fromEntries(
      routing.locales.map((locale) => [locale, url(locale, path)]),
    )
    languages['x-default'] = url(routing.defaultLocale, path)

    return routing.locales.map((locale) => ({
      url: url(locale, path),
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: path === '' ? 1 : 0.7,
      alternates: { languages },
    }))
  })
}
